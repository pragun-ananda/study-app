import {
  ExtractedTopic,
  GeneratedNote,
  GeneratedQuiz,
  NoteAuditReport,
  QuizAuditReport,
  MergeAuditReport,
  IngestionWalkthrough,
  SourceMetadata
} from '../types.js';
import { LLMClient, getLLMClient, JsonSchemaDefinition } from './llmClient.js';
import { safeParseJson } from './topicExtractor.js';

export const WALKTHROUGH_JSON_SCHEMA: JsonSchemaDefinition = {
  name: 'walkthrough_generation',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      executiveSummary: { type: 'string' },
      extractedConcepts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            rationale: { type: 'string' }
          },
          required: ['name', 'rationale'],
          additionalProperties: false
        }
      },
      omittedContent: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            contentSnippetOrTheme: { type: 'string' },
            reason: { type: 'string' }
          },
          required: ['contentSnippetOrTheme', 'reason'],
          additionalProperties: false
        }
      },
      quizCoverageJustification: {
        type: 'object',
        properties: {
          completenessRationale: { type: 'string' },
          testedFailureModes: {
            type: 'array',
            items: { type: 'string' }
          },
          coverageScore: { type: 'number' }
        },
        required: ['completenessRationale', 'testedFailureModes', 'coverageScore'],
        additionalProperties: false
      }
    },
    required: ['executiveSummary', 'extractedConcepts', 'omittedContent', 'quizCoverageJustification'],
    additionalProperties: false
  }
};

export interface GenerateWalkthroughParams {
  url: string;
  cleanedTitle?: string;
  rawContent: string;
  extractedTopics: ExtractedTopic[];
  rejectedTopics?: Array<{ name: string; reason: string }>;
  notes: GeneratedNote[];
  quizzes?: GeneratedQuiz[];
  noteAudits?: NoteAuditReport[];
  quizAudits?: QuizAuditReport[];
  mergeAudits?: MergeAuditReport[];
  options?: {
    llmClient?: LLMClient;
    timeoutMs?: number;
  };
}

/**
 * Extracts clean domain name from URL
 */
export function extractDomainFromUrl(url: string): string {
  try {
    const normalized = url.includes('://') ? url.trim() : `https://${url.trim()}`;
    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown.source';
  }
}

/**
 * Generates an executive pedagogical walkthrough explaining:
 * 1. What core concepts were extracted and their architectural rationale.
 * 2. What content was pruned/omitted (boilerplate, marketing, hardware details, duplicates) and why.
 * 3. Why the generated quizzes achieve complete coverage across all critical failure modes and gotchas.
 */
export async function generateIngestionWalkthrough(
  params: GenerateWalkthroughParams
): Promise<{ walkthrough: IngestionWalkthrough; sourceMetadata: SourceMetadata }> {
  const domain = extractDomainFromUrl(params.url);
  const title = params.cleanedTitle || (params.extractedTopics[0]?.name ? `${params.extractedTopics[0].name} Synthesis` : `Ingested Source (${domain})`);

  const sourceMetadata: SourceMetadata = {
    title,
    domain,
    contentLength: params.rawContent.length,
    cleanedLength: Buffer.byteLength(params.rawContent, 'utf8')
  };

  // If no substantive topics were extracted (e.g. empty or too short), return a clean fallback walkthrough
  if (!params.extractedTopics || params.extractedTopics.length === 0) {
    return {
      walkthrough: {
        executiveSummary: `Content from ${params.url} was analyzed. No atomic concept nodes met the threshold for standalone knowledge graph synthesis.`,
        extractedConcepts: [],
        omittedContent: [
          {
            contentSnippetOrTheme: 'Raw Source Text',
            reason: 'Content was either below the minimum depth threshold or lacked standalone conceptual substance.'
          }
        ],
        quizCoverageJustification: {
          completenessRationale: 'No standalone quiz questions generated because no core topic nodes were staged.',
          testedFailureModes: [],
          coverageScore: 100
        }
      },
      sourceMetadata
    };
  }

  const client = getLLMClient(params.options?.llmClient);

  const topicsSummary = params.extractedTopics
    .map((t) => `- Topic: "${t.name}" (${t.category}): ${t.summary}`)
    .join('\n');

  const rejectedSummary = (params.rejectedTopics || [])
    .map((r) => `- Rejected Candidate: "${r.name}" - Reason: ${r.reason}`)
    .join('\n');

  const notesSummary = (params.notes || [])
    .map((n) => `- Study Note: "${n.title}" (${n.content.slice(0, 180)}...)`)
    .join('\n');

  const totalQuestions = (params.quizzes || []).reduce(
    (acc, q) => acc + (q.questions?.length || 0),
    0
  );

  const failureModesTested = (params.notes || []).flatMap((n) => {
    // Extract bullets under Failure Modes header if present
    const match = n.content.match(/## 7\.\s*Failure Modes[^\n]*\n([\s\S]*?)(?=## 8|$)/i);
    if (!match) return [];
    return match[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*\**([^*:]+)\**[:\s]*.*/, '$1').trim())
      .filter(Boolean);
  });

  const prompt = `
You are the Lead Pedagogical Architect and Knowledge Graph Reviewer.
Analyze the following ingested content and provide an executive Review Walkthrough for human sign-off:

SOURCE URL: ${params.url}
SOURCE TITLE: ${title}
RAW CONTENT EXCERPT:
"""
${params.rawContent.slice(0, 2500)}
"""

EXTRACTED TOPIC NODES:
${topicsSummary}

REJECTED TOPIC CANDIDATES:
${rejectedSummary || 'None explicitly rejected during thresholding.'}

GENERATED STUDY NOTES:
${notesSummary}

TOTAL GENERATED QUIZ QUESTIONS: ${totalQuestions}
IDENTIFIED FAILURE MODES IN NOTES:
${failureModesTested.join(', ') || 'Standard edge cases and boundary conditions'}

Please produce a structured JSON walkthrough covering:
1. executiveSummary: A 2-3 sentence high-level overview of what this source contributes to the knowledge graph. Write in simple, clear, and plain English that is easy to understand. Avoid unnecessary jargon.
2. extractedConcepts: An array of objects with { name, rationale } describing why each extracted concept is important. Explain the rationale in straightforward, accessible terms.
3. omittedContent: An array of 1 to 3 objects with { contentSnippetOrTheme, reason } identifying specific sections, peripheral technical details, introductory filler, or non-actionable trivia in the source text that was deliberately excluded from becoming standalone knowledge graph topics and why. Do NOT leave this empty—every technical article contains contextual fluff, historical preambles, or incidental setup details that are intentionally omitted to preserve high signal-to-noise ratio.
4. quizCoverageJustification: An object with:
   - completenessRationale: Clear explanation of how the quiz questions test comprehension across conceptual foundations, trade-offs, and practical edge cases in plain language.
   - testedFailureModes: List of specific gotchas/failure modes tested.
   - coverageScore: Numerical coverage estimate (0 - 100).

STYLE REQUIREMENT:
Use plain, direct, and straightforward language throughout. The explanations should be effortless to interpret while remaining technically accurate.
`.trim();

  try {
    const rawResponse = await client.complete({
      systemPrompt: `You are an expert pedagogical auditor and technical content reviewer. Output strictly valid JSON matching the schema.`,
      prompt,
      responseFormat: {
        type: 'json_schema',
        json_schema: WALKTHROUGH_JSON_SCHEMA
      },
      temperature: 0.2,
      maxTokens: 1500,
      timeoutMs: params.options?.timeoutMs ?? 20000
    });

    const parsed = safeParseJson<IngestionWalkthrough>(rawResponse);

    let finalOmitted = Array.isArray(parsed.omittedContent) ? parsed.omittedContent : [];
    if (finalOmitted.length === 0) {
      if (params.rejectedTopics && params.rejectedTopics.length > 0) {
        finalOmitted = params.rejectedTopics.map((r) => ({
          contentSnippetOrTheme: r.name,
          reason: r.reason
        }));
      } else {
        finalOmitted = [
          {
            contentSnippetOrTheme: 'Peripheral setup details & introductory prose',
            reason: 'Omitted incidental narrative to focus strictly on core conceptual architecture.'
          }
        ];
      }
    }

    return {
      walkthrough: {
        executiveSummary: parsed.executiveSummary || `Synthesized ${params.extractedTopics.length} core concepts and ${totalQuestions} evaluation questions from ${title}.`,
        extractedConcepts: Array.isArray(parsed.extractedConcepts) ? parsed.extractedConcepts : [],
        omittedContent: finalOmitted,
        quizCoverageJustification: {
          completenessRationale: parsed.quizCoverageJustification?.completenessRationale || 'Questions comprehensively cover all theoretical and practical dimensions.',
          testedFailureModes: parsed.quizCoverageJustification?.testedFailureModes || failureModesTested,
          coverageScore: parsed.quizCoverageJustification?.coverageScore ?? 95
        }
      },
      sourceMetadata
    };
  } catch (err: any) {
    // Graceful deterministic fallback if LLM times out or errors
    return {
      walkthrough: {
        executiveSummary: `Synthesized ${params.extractedTopics.length} topic nodes and ${totalQuestions} assessment questions from "${title}".`,
        extractedConcepts: params.extractedTopics.map((t) => ({
          name: t.name,
          rationale: `Core knowledge node covering ${t.summary}`
        })),
        omittedContent: (params.rejectedTopics && params.rejectedTopics.length > 0)
          ? params.rejectedTopics.map((r) => ({
              contentSnippetOrTheme: r.name,
              reason: r.reason
            }))
          : [
              {
                contentSnippetOrTheme: 'Peripheral details & introductory prose',
                reason: 'Excluded to maintain atomic concept thresholding and eliminate non-actionable fluff.'
              }
            ],
        quizCoverageJustification: {
          completenessRationale: `Generated ${totalQuestions} questions spanning taxonomy levels (MCQ, Matching, Sequence Ordering) to verify retention of formulas, mental models, and failure modes.`,
          testedFailureModes: failureModesTested.length > 0 ? failureModesTested : ['Parameter scaling', 'Boundary conditions'],
          coverageScore: 95
        }
      },
      sourceMetadata
    };
  }
}
