/**
 * LLM Prompt Templates for Research Operations
 */

const researchPrompt = (query, sources, academicPapers = []) => `
You are a research assistant. Based on the following research question and web sources,
provide a comprehensive, well-structured research summary.

RESEARCH QUESTION: ${query}

WEB SOURCES:
${sources
                .map(
                        (s, i) => `
[Source ${i + 1}] ${s.title}
URL: ${s.url}
Content: ${s.content?.substring(0, 2000) || 'No content available'}
`
                )
                .join('\n')}
${academicPapers.length > 0
                ? `
ACADEMIC PAPERS:
${academicPapers
                        .map(
                                (p, i) => `
[Paper ${i + 1}] ${p.title}
Authors: ${(p.authors || []).join(', ')}
Year: ${p.year || 'N/A'}
Citations: ${p.citationCount || 0}
Abstract: ${(p.abstract || '').substring(0, 800)}
`
                        )
                        .join('\n')}`
                : ''
        }

INSTRUCTIONS:
1. Provide a clear title for the research summary
2. Write a comprehensive summary citing sources inline as [Source N] and papers as [Paper N]
3. List 5-8 key points
4. Assign a confidence score (0.0 to 1.0) based on source quality and agreement

Respond ONLY in this JSON format:
{
  "title": "...",
  "summary": "...",
  "key_points": ["...", "..."],
  "confidence_score": 0.0
}
`;

const followUpResearchPrompt = (query, sources, previousContext, academicPapers = []) => `
You are a research assistant continuing a research thread. The user has asked a follow-up
question based on previous research. Use the previous context to provide a deeper, more
targeted answer.

PREVIOUS RESEARCH CONTEXT:
Title: ${previousContext.title || 'N/A'}
Summary: ${previousContext.summary || 'N/A'}
Key Findings: ${(previousContext.key_points || []).join('; ')}

FOLLOW-UP QUESTION: ${query}

WEB SOURCES:
${sources
                .map(
                        (s, i) => `
[Source ${i + 1}] ${s.title}
URL: ${s.url}
Content: ${s.content?.substring(0, 2000) || 'No content available'}
`
                )
                .join('\n')}
${academicPapers.length > 0
                ? `
ACADEMIC PAPERS:
${academicPapers
                        .map(
                                (p, i) => `
[Paper ${i + 1}] ${p.title}
Authors: ${(p.authors || []).join(', ')}
Year: ${p.year || 'N/A'}
Abstract: ${(p.abstract || '').substring(0, 800)}
`
                        )
                        .join('\n')}`
                : ''
        }

INSTRUCTIONS:
1. Build upon the previous research context — don't repeat it
2. Answer the follow-up question with new insights
3. Reference previous findings where relevant
4. Cite sources inline as [Source N] and papers as [Paper N]
5. List 5-8 NEW key points specific to the follow-up

Respond ONLY in this JSON format:
{
  "title": "...",
  "summary": "...",
  "key_points": ["...", "..."],
  "confidence_score": 0.0
}
`;

const hallucinationCheckPrompt = (gptResponse, claudeResponse, sources) => `
You are a fact-checking AI. Compare the following two AI-generated research responses
and identify any hallucinated or unsupported claims.

LLAMA 3.3 70B RESPONSE:
${JSON.stringify(gptResponse, null, 2)}

GPT-OSS 120B RESPONSE:
${JSON.stringify(claudeResponse, null, 2)}

ORIGINAL SOURCES:
${sources
                .map(
                        (s, i) => `
[Source ${i + 1}] ${s.title} — ${s.url}
${s.content?.substring(0, 1500) || ''}
`
                )
                .join('\n')}

INSTRUCTIONS:
1. Compare both responses for factual consistency
2. Cross-reference claims against the original sources
3. Identify any claims NOT supported by the sources
4. Assess overall hallucination risk

Respond ONLY in this JSON format:
{
  "hallucination_risk": "low|medium|high",
  "unsupported_claims": ["claim 1", "claim 2"],
  "analysis": "Brief explanation of findings"
}
`;

const groundedSummaryPrompt = (query, gptResponse, claudeResponse, sources) => `
You are producing a final grounded research summary. Synthesize the best information 
from two AI research responses, strictly grounding all claims in the provided sources.

RESEARCH QUESTION: ${query}

LLAMA 3.3 70B ANALYSIS:
${JSON.stringify(gptResponse, null, 2)}

GPT-OSS 120B ANALYSIS:
${JSON.stringify(claudeResponse, null, 2)}

VERIFIED SOURCES:
${sources
                .map(
                        (s, i) => `
[Source ${i + 1}] ${s.title}
URL: ${s.url}
Content: ${s.content?.substring(0, 1500) || ''}
`
                )
                .join('\n')}

INSTRUCTIONS:
1. Create a comprehensive title
2. Write a detailed summary citing sources as [Source N]
3. Extract 5-10 key insights
4. List all citations used
5. Assign a confidence score (0.0-1.0)

Respond ONLY in this JSON format:
{
  "title": "...",
  "summary": "...",
  "key_points": ["...", "..."],
  "citations": [
    {"url": "...", "title": "...", "snippet": "relevant excerpt"}
  ],
  "confidence_score": 0.0
}
`;

const knowledgeGraphPrompt = (query, summary, keyPoints) => `
You are an entity extraction engine. Extract the key entities and concepts from the 
following research summary. Categorize each entity.

RESEARCH QUESTION: ${query}

SUMMARY: ${summary}

KEY POINTS:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

INSTRUCTIONS:
Extract 5-10 important entities (concepts, technologies, people, organizations, methods, fields).
For each entity, provide a name and category.

Valid categories: technology, concept, person, organization, method, field, other

Respond ONLY in this JSON format:
{
  "entities": [
    {"name": "Entity Name", "category": "technology"},
    {"name": "Another Entity", "category": "concept"}
  ]
}
`;

module.exports = {
        researchPrompt,
        followUpResearchPrompt,
        hallucinationCheckPrompt,
        groundedSummaryPrompt,
        knowledgeGraphPrompt,
};
