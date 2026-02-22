const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Academic Search Service
 * Queries arXiv and Semantic Scholar APIs for research papers
 */
class AcademicSearchService {
    /**
     * Search both arXiv and Semantic Scholar in parallel
     */
    async searchPapers(query, maxResults = 5) {
        try {
            const [arxivResults, scholarResults] = await Promise.allSettled([
                this._searchArxiv(query, maxResults),
                this._searchSemanticScholar(query, maxResults),
            ]);

            const papers = [
                ...(arxivResults.status === 'fulfilled' ? arxivResults.value : []),
                ...(scholarResults.status === 'fulfilled' ? scholarResults.value : []),
            ];

            // Deduplicate by title similarity
            const seen = new Set();
            const unique = papers.filter((p) => {
                const key = p.title.toLowerCase().replace(/\s+/g, ' ').trim();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            // Sort by citation count (descending), then by year (newest first)
            unique.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0) || (b.year || 0) - (a.year || 0));

            return unique.slice(0, maxResults * 2);
        } catch (error) {
            console.error('Academic search error:', error.message);
            return [];
        }
    }

    /**
     * Search arXiv API — returns XML, parsed into structured results
     */
    async _searchArxiv(query, maxResults = 5) {
        try {
            // Extract meaningful search terms (remove filler words for better arXiv matching)
            const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'for', 'to', 'and', 'or', 'is', 'are', 'what', 'how', 'why', 'with', 'its', 'their', 'this', 'that', 'from', 'by', 'at', 'be', 'has', 'have', 'it', 'was', 'were', 'will', 'can', 'do', 'does', 'about', 'future']);
            const terms = query
                .toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 2 && !stopWords.has(w));

            // Build arXiv query: search in title OR abstract with AND-joined keywords
            const arxivTerms = terms.slice(0, 5).map(t => `ti:${t}+OR+abs:${t}`).join('+AND+');
            const searchQuery = arxivTerms || encodeURIComponent(query);
            const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

            const response = await axios.get(url, {
                timeout: 10000,
                headers: { 'User-Agent': 'DualMind/1.0' },
            });

            const $ = cheerio.load(response.data, { xmlMode: true });
            const papers = [];

            $('entry').each((i, el) => {
                const entry = $(el);
                const title = entry.find('title').text().replace(/\s+/g, ' ').trim();
                const abstract = entry.find('summary').text().replace(/\s+/g, ' ').trim();
                const published = entry.find('published').text();
                const year = published ? new Date(published).getFullYear() : null;

                const authors = [];
                entry.find('author name').each((_, authorEl) => {
                    authors.push($(authorEl).text().trim());
                });

                // Get the PDF link or abs link
                let pdfUrl = '';
                let absUrl = '';
                entry.find('link').each((_, linkEl) => {
                    const link = $(linkEl);
                    if (link.attr('title') === 'pdf') {
                        pdfUrl = link.attr('href');
                    }
                    if (link.attr('type') === 'text/html') {
                        absUrl = link.attr('href');
                    }
                });

                if (title && title !== '') {
                    papers.push({
                        title,
                        authors: authors.slice(0, 5),
                        year,
                        abstract: abstract.substring(0, 500),
                        url: absUrl || pdfUrl || '',
                        citationCount: 0, // arXiv doesn't provide citation counts
                        source: 'arxiv',
                    });
                }
            });

            return papers;
        } catch (error) {
            console.error('arXiv search error:', error.message);
            return [];
        }
    }

    /**
     * Search Semantic Scholar API — returns JSON with citation counts
     */
    async _searchSemanticScholar(query, maxResults = 5) {
        try {
            const url = `https://api.semanticscholar.org/graph/v1/paper/search`;
            const response = await axios.get(url, {
                params: {
                    query,
                    limit: maxResults,
                    fields: 'title,authors,year,abstract,citationCount,url,externalIds',
                },
                timeout: 10000,
                headers: { 'User-Agent': 'ResearchMind-AI/1.0' },
            });

            if (!response.data || !response.data.data) {
                return [];
            }

            return response.data.data
                .filter((paper) => paper.title)
                .map((paper) => ({
                    title: paper.title,
                    authors: (paper.authors || []).map((a) => a.name).slice(0, 5),
                    year: paper.year,
                    abstract: (paper.abstract || '').substring(0, 500),
                    url: paper.externalIds?.DOI
                        ? `https://doi.org/${paper.externalIds.DOI}`
                        : paper.url || '',
                    citationCount: paper.citationCount || 0,
                    source: 'scholar',
                }));
        } catch (error) {
            console.error('Semantic Scholar search error:', error.message);
            return [];
        }
    }
}

module.exports = new AcademicSearchService();
