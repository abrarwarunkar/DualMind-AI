const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Web Search & Scraping Service
 * Uses DuckDuckGo Instant Answer API + Google scraping with proper headers
 */
class SearchService {
    /**
     * Search the web — tries multiple methods for reliability
     */
    async searchWeb(query, numResults = 5) {
        // Method 1: DuckDuckGo Instant Answer API (JSON, always works)
        let results = await this._duckDuckGoAPI(query, numResults);
        if (results.length >= 2) return results;

        // Method 2: Bing scraping with proper headers
        const bingResults = await this._bingScrape(query, numResults);
        if (bingResults.length > 0) return bingResults;

        // Method 3: Wikipedia as last resort
        const wikiResults = await this._wikiSearch(query, numResults);
        return wikiResults;
    }

    /**
     * DuckDuckGo Instant Answer API — always available, returns related topics
     */
    async _duckDuckGoAPI(query, numResults) {
        try {
            const response = await axios.get('https://api.duckduckgo.com/', {
                params: {
                    q: query,
                    format: 'json',
                    no_html: 1,
                    skip_disambig: 1,
                },
                timeout: 8000,
                headers: {
                    'User-Agent': 'ResearchMind/1.0 (Research Assistant)',
                },
            });

            const data = response.data;
            const results = [];

            // Abstract result (main topic)
            if (data.AbstractURL && data.Abstract) {
                results.push({
                    url: data.AbstractURL,
                    title: data.Heading || query,
                    snippet: data.Abstract,
                });
            }

            // Related topics
            if (data.RelatedTopics) {
                for (const topic of data.RelatedTopics) {
                    if (results.length >= numResults) break;

                    if (topic.FirstURL && topic.Text) {
                        results.push({
                            url: topic.FirstURL,
                            title: topic.Text.substring(0, 100),
                            snippet: topic.Text,
                        });
                    }

                    // Handle subtopics
                    if (topic.Topics) {
                        for (const sub of topic.Topics) {
                            if (results.length >= numResults) break;
                            if (sub.FirstURL && sub.Text) {
                                results.push({
                                    url: sub.FirstURL,
                                    title: sub.Text.substring(0, 100),
                                    snippet: sub.Text,
                                });
                            }
                        }
                    }
                }
            }

            // Results section
            if (data.Results) {
                for (const r of data.Results) {
                    if (results.length >= numResults) break;
                    if (r.FirstURL && r.Text) {
                        results.push({
                            url: r.FirstURL,
                            title: r.Text.substring(0, 100),
                            snippet: r.Text,
                        });
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('DuckDuckGo API error:', error.message);
            return [];
        }
    }

    /**
     * Bing search scraping
     */
    async _bingScrape(query, numResults) {
        try {
            const response = await axios.get('https://www.bing.com/search', {
                params: { q: query, count: numResults },
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate',
                },
                timeout: 10000,
            });

            const $ = cheerio.load(response.data);
            const results = [];

            $('li.b_algo').each((i, el) => {
                if (results.length >= numResults) return false;

                const titleEl = $(el).find('h2 a');
                const snippetEl = $(el).find('.b_caption p, .b_lineclamp2');

                const title = titleEl.text().trim();
                const url = titleEl.attr('href') || '';
                const snippet = snippetEl.text().trim();

                if (url && title && url.startsWith('http')) {
                    results.push({ url, title, snippet });
                }
            });

            return results;
        } catch (error) {
            console.error('Bing scrape error:', error.message);
            return [];
        }
    }

    /**
     * Wikipedia search API — very reliable last resort
     */
    async _wikiSearch(query, numResults = 5) {
        try {
            // Use the search API (more reliable than opensearch)
            const response = await axios.get('https://en.wikipedia.org/w/api.php', {
                params: {
                    action: 'query',
                    list: 'search',
                    srsearch: query,
                    srlimit: numResults,
                    utf8: 1,
                    format: 'json',
                    origin: '*',
                },
                headers: {
                    'User-Agent': 'ResearchMind/1.0 (Research Assistant; mailto:research@researchmind.ai)',
                },
                timeout: 8000,
            });

            const searchResults = response.data?.query?.search || [];
            return searchResults.map((r) => ({
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
                title: r.title,
                snippet: r.snippet.replace(/<[^>]+>/g, ''), // Strip HTML tags
            }));
        } catch (error) {
            console.error('Wikipedia search error:', error.message);
            return [];
        }
    }

    /**
     * Scrape and clean content from a URL
     */
    async scrapeUrl(url) {
        try {
            const response = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                maxRedirects: 3,
            });

            return this.cleanText(response.data);
        } catch (error) {
            console.warn(`Failed to scrape ${url}: ${error.message}`);
            return '';
        }
    }

    /**
     * Clean raw HTML into readable text
     */
    cleanText(html) {
        try {
            const $ = cheerio.load(html);

            // Remove unwanted elements
            $('script, style, nav, footer, header, aside, iframe, noscript, .ads, .cookie-banner, .sidebar').remove();

            // Extract main content areas
            const mainContent =
                $('article').text() ||
                $('main').text() ||
                $('[role="main"]').text() ||
                $('.mw-parser-output').text() || // Wikipedia
                $('body').text();

            return mainContent
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim()
                .substring(0, 5000);
        } catch {
            return '';
        }
    }

    /**
     * Search and scrape — pipeline for getting grounded sources
     */
    async getGroundedSources(query) {
        const searchResults = await this.searchWeb(query);

        if (searchResults.length === 0) {
            console.warn('No search results found for grounding');
            return [];
        }

        console.log(`Found ${searchResults.length} sources, scraping content...`);

        const scrapedSources = await Promise.all(
            searchResults.map(async (result) => {
                const content = await this.scrapeUrl(result.url);
                return {
                    url: result.url,
                    title: result.title,
                    snippet: result.snippet,
                    content: content || result.snippet,
                };
            })
        );

        // Filter out sources with no useful content
        return scrapedSources.filter((s) => s.content && s.content.length > 50);
    }
}

module.exports = new SearchService();
