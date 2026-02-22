/**
 * Research Service Unit Tests
 * Tests LLM service, search service, and hallucination detection using mocks
 */

// Mock external dependencies
jest.mock('../config/keys', () => ({
    NODE_ENV: 'test',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    SERPAPI_KEY: '',
}));

describe('LLM Service', () => {
    let llmService;

    beforeAll(() => {
        llmService = require('../services/llmService');
    });

    it('should return mock GPT response in dev mode', async () => {
        const result = await llmService.queryOpenAI('What is quantum computing?', []);
        expect(result).toBeDefined();
        expect(result.title).toContain('quantum computing');
        expect(result.summary).toBeDefined();
        expect(result.key_points).toBeInstanceOf(Array);
        expect(result.confidence_score).toBeGreaterThan(0);
    });

    it('should return mock Claude response in dev mode', async () => {
        const result = await llmService.queryAnthropic('What is machine learning?', []);
        expect(result).toBeDefined();
        expect(result.title).toContain('machine learning');
        expect(result.key_points.length).toBeGreaterThan(0);
    });

    it('should compare both models', async () => {
        const result = await llmService.compareResponses('AI ethics', []);
        expect(result.gptResponse).toBeDefined();
        expect(result.claudeResponse).toBeDefined();
        expect(result.gptResponse.summary).toBeDefined();
        expect(result.claudeResponse.summary).toBeDefined();
    });
});

describe('Search Service', () => {
    let searchService;

    beforeAll(() => {
        searchService = require('../services/searchService');
    });

    it('should return mock search results', async () => {
        const results = await searchService.searchWeb('quantum computing');
        expect(results).toBeInstanceOf(Array);
        expect(results.length).toBe(5);
        expect(results[0].url).toBeDefined();
        expect(results[0].title).toBeDefined();
    });

    it('should clean HTML content', () => {
        const html = '<html><body><p>Hello world</p><script>evil()</script></body></html>';
        const clean = searchService.cleanText(html);
        expect(clean).toContain('Hello world');
        expect(clean).not.toContain('evil');
    });

    it('should get grounded sources', async () => {
        const sources = await searchService.getGroundedSources('test query');
        expect(sources).toBeInstanceOf(Array);
        expect(sources.length).toBeGreaterThan(0);
        expect(sources[0].content).toBeDefined();
    });
});

describe('Hallucination Service', () => {
    let hallucinationService;

    beforeAll(() => {
        hallucinationService = require('../services/hallucinationService');
    });

    it('should detect hallucination risk', async () => {
        const gptResponse = {
            title: 'Test',
            summary: 'Test summary',
            key_points: ['Point 1 about AI', 'Point 2 about machine learning'],
            confidence_score: 0.8,
        };

        const claudeResponse = {
            title: 'Test',
            summary: 'Test summary similar',
            key_points: ['Point 1 about AI', 'Point 3 about deep learning'],
            confidence_score: 0.75,
        };

        const sources = [
            {
                url: 'https://example.com',
                title: 'AI Source',
                content: 'Content about AI and machine learning and deep learning techniques',
            },
        ];

        const result = await hallucinationService.detectHallucinations(
            gptResponse,
            claudeResponse,
            sources
        );

        expect(result.hallucination_risk).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(result.hallucination_risk);
        expect(result.unsupported_claims).toBeInstanceOf(Array);
        expect(result.analysis).toBeDefined();
    });
});

describe('Export Service', () => {
    let exportService;

    beforeAll(() => {
        exportService = require('../services/exportService');
    });

    it('should generate markdown export', () => {
        const session = {
            query: 'Test query',
            compareMode: true,
            groundedSummary: {
                title: 'Test Research',
                summary: 'This is a test summary',
                key_points: ['Point 1', 'Point 2'],
                confidence_score: 0.85,
                citations: [
                    { url: 'https://example.com', title: 'Source 1' },
                ],
            },
            gptResponse: { summary: 'GPT says...', confidence_score: 0.8 },
            claudeResponse: { summary: 'Claude says...', confidence_score: 0.82 },
            hallucinationReport: {
                hallucination_risk: 'low',
                unsupported_claims: [],
                analysis: 'All claims verified',
            },
            createdAt: new Date(),
        };

        const markdown = exportService.exportToMarkdown(session);
        expect(markdown).toContain('# Test Research');
        expect(markdown).toContain('Test query');
        expect(markdown).toContain('Key Findings');
        expect(markdown).toContain('Point 1');
        expect(markdown).toContain('🟢');
        expect(markdown).toContain('85%');
    });

    it('should generate PDF buffer', async () => {
        const session = {
            query: 'PDF Test',
            groundedSummary: {
                title: 'PDF Test Title',
                summary: 'Test summary for PDF',
                key_points: ['Key point 1'],
                confidence_score: 0.9,
                citations: [],
            },
            hallucinationReport: {
                hallucination_risk: 'low',
                analysis: 'All good',
            },
            createdAt: new Date(),
        };

        const buffer = await exportService.exportToPDF(session);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
        // PDF files start with %PDF
        expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
    });
});
