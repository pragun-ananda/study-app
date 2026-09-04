import {
  GeneratedNote,
  GeneratedQuiz,
  GeneratedQuizQuestion,
  GenerateQuizOptions,
  GenerateQuizResult,
  QuizAuditReport,
  QuizQuestionType,
  MCQPayload,
  TrueFalsePayload,
  MatchingPayload,
  OrderingPayload,
  FlashcardPayload
} from '../types.js';
import { LLMClient, getLLMClient, JsonSchemaDefinition } from './llmClient.js';
import { safeParseJson } from './topicExtractor.js';

export const DEFAULT_MAX_QUIZ_REFINEMENT_ITERATIONS = 2;
export const QUIZ_PASSING_SCORE_THRESHOLD = 90;

const QUIZ_AUDIT_JSON_SCHEMA: JsonSchemaDefinition = {
  name: 'quiz_audit_report',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      passed: { type: 'boolean' },
      coverageScore: { type: 'number' },
      untestedSections: {
        type: 'array',
        items: { type: 'string' }
      },
      flawedQuestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'number' },
            reason: { type: 'string' }
          },
          required: ['index', 'reason'],
          additionalProperties: false
        }
      },
      feedback: { type: 'string' }
    },
    required: ['passed', 'coverageScore', 'untestedSections', 'flawedQuestions', 'feedback'],
    additionalProperties: false
  }
};

/**
 * Deterministically verifies quiz questions:
 * - MCQs have valid options (A, B, C, D) and matching correctAnswer.
 * - Matching questions have >= 2 pairs.
 * - Ordering questions have >= 3 steps.
 * - Flashcards only used with memorizationReason.
 */
export function validateQuizQuestions(questions: GeneratedQuizQuestion[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(questions) || questions.length === 0) {
    return { valid: false, errors: ['Quiz contains zero questions.'] };
  }

  questions.forEach((q, idx) => {
    if (!q.prompt || typeof q.prompt !== 'string' || !q.prompt.trim()) {
      errors.push(`Question #${idx + 1} has an empty or invalid prompt.`);
    }

    if (!q.explanation || typeof q.explanation !== 'string' || !q.explanation.trim()) {
      errors.push(`Question #${idx + 1} is missing an explanation.`);
    }

    if (q.type === 'MCQ') {
      const payload = q.payload as MCQPayload;
      if (!Array.isArray(payload?.options) || payload.options.length < 3) {
        errors.push(`MCQ Question #${idx + 1} must contain at least 3-4 options.`);
      }
      if (Array.isArray(payload?.options)) {
        const optionIds = payload.options.map((o) => (o?.id || '').toUpperCase());
        const correctUpper = (q.correctAnswer || '').trim().toUpperCase();
        if (!optionIds.includes(correctUpper)) {
          errors.push(
            `MCQ Question #${idx + 1} correctAnswer '${q.correctAnswer}' does not match any option ID (${optionIds.join(', ')}).`
          );
        }
      }
    } else if (q.type === 'MATCHING') {
      const payload = q.payload as MatchingPayload;
      if (!Array.isArray(payload?.pairs) || payload.pairs.length < 2) {
        errors.push(`Matching Question #${idx + 1} must contain at least 2 term-definition pairs.`);
      }
    } else if (q.type === 'ORDERING') {
      const payload = q.payload as OrderingPayload;
      if (!Array.isArray(payload?.items) || payload.items.length < 3) {
        errors.push(`Ordering Question #${idx + 1} must contain at least 3 sequence items.`);
      }
    } else if (q.type === 'FLASHCARD') {
      const payload = q.payload as FlashcardPayload;
      if (!payload?.memorizationReason) {
        errors.push(
          `Flashcard Question #${idx + 1} must specify a memorizationReason justifying why rote recall is necessary.`
        );
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generates and audits a comprehensive, challenging quiz for a study note.
 * Enforces high-yield questions (MCQ, True/False, Matching, Sequence Ordering, restricted Flashcards)
 * with 100% note coverage and a bounded 2-iteration refinement loop.
 */
export async function generateSingleTopicQuiz(
  note: GeneratedNote,
  options?: GenerateQuizOptions
): Promise<{ quiz: GeneratedQuiz; auditReport: QuizAuditReport }> {
  const client: LLMClient = getLLMClient(options?.llmClient);
  const maxIterations = options?.maxRefinementIterations ?? DEFAULT_MAX_QUIZ_REFINEMENT_ITERATIONS;
  const timeoutMs = options?.timeoutMs ?? 20000;

  const generatorSystemPrompt = `You are an Elite Academic Assessment Architect and Exam Designer.
Your task is to synthesize a high-rigor, comprehensive study quiz based STRICTLY on the provided study note.
The quiz MUST achieve 100% COVERAGE of the note across its core sections:
1. Problem Context & The "Why"
2. Conceptual Core & Mental Model
3. Formal Specification & Math/Mechanics
4. Implementation & Code Patterns
5. Step-by-Step Worked Trace
6. Trade-Offs, Alternatives & Decision Matrix
7. Failure Modes, Edge Cases & Pitfalls
8. Summary & Key Takeaways

QUESTION FORMAT TAXONOMY (PRIORITIZE CHALLENGING FORMATS):
1. 'MCQ' (Multiple Choice Questions):
   - Stem: Challenging scenario, architectural dilemma, or comparative trade-off drawn from the Decision Matrix.
   - Options: Exactly 4 options (ids: 'A', 'B', 'C', 'D'). Plausible distractors targeting common cognitive traps.
   - Distractor Rationales: Provide 'distractorExplanations' explaining WHY each distractor is wrong.
2. 'TRUE_FALSE':
   - Tests subtle nuances, asymptotic claims, or counter-intuitive edge cases. Avoid obvious statements.
3. 'MATCHING':
   - Match terms, data structures, or trade-offs to their exact definitions, alternatives, or roles. Provide at least 3-4 pairs.
4. 'ORDERING':
   - Chronological sequence of execution steps drawn from the Worked Trace section or pipeline flow. Provide at least 3-4 items.
5. 'FLASHCARD' (STRICTLY RESTRICTED):
   - Only use for facts requiring raw rote memorization (e.g. constant values, exact notation definitions).
   - MUST provide 'memorizationReason'. Do NOT use for general concepts.

CRITICAL RULES:
- Exactly ONE unambiguously correct answer per question.
- No giveaway distractors ("All of the above", "None of the above", or absurd options).
- Reference the specific 'sourceAssertion' from the note for each question.

Output format must be a JSON object with a 'questions' array.`;

  let currentQuestions: GeneratedQuizQuestion[] = [];
  let lastAuditReport: QuizAuditReport = {
    topicName: note.topicName,
    passed: false,
    coverageScore: 0,
    untestedSections: [],
    flawedQuestions: [],
    feedback: '',
    refinementIterations: 0
  };

  let iteration = 0;

  while (iteration <= maxIterations) {
    let generatorPrompt = `<study_note topic="${note.topicName}">
${note.content}
</study_note>`;

    if (iteration > 0 && lastAuditReport.feedback) {
      generatorPrompt += `\n\n<critic_revision_feedback iteration="${iteration}">
The previous quiz draft was audited and flagged the following issues:
- Untested Note Sections: ${JSON.stringify(lastAuditReport.untestedSections)}
- Flawed Questions: ${JSON.stringify(lastAuditReport.flawedQuestions)}
- Reviewer Guidance: ${lastAuditReport.feedback}

Please re-generate the complete quiz questions, resolving all ambiguities and ensuring 100% coverage of all note sections.
</critic_revision_feedback>`;
    } else {
      generatorPrompt += `\n\nSynthesize a rigorous, 4 to 6 question assessment providing 100% coverage of the study note above.`;
    }

    // Step 1: Generator LLM Call
    const generatorResponse = await client.complete({
      systemPrompt: generatorSystemPrompt,
      prompt: generatorPrompt,
      responseFormat: { type: 'json_object' },
      temperature: 0.2,
      timeoutMs
    });

    try {
      const parsed = safeParseJson<{ questions: GeneratedQuizQuestion[] }>(generatorResponse);
      currentQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    } catch {
      currentQuestions = [];
    }

    // Step 2: Deterministic Question Integrity Validation
    const questionCheck = validateQuizQuestions(currentQuestions);

    // Step 3: Quiz Critic & Answer Key Auditor
    const criticSystemPrompt = `You are a Strict Quiz Critic, Examination Auditor, and Psychometric Assessment Auditor.
Your job is to audit study quiz questions against the provided study note.

EVALUATION RUBRIC:
1. 100% NOTE COVERAGE: Are all major sections of the note (Core Concept, Math, Code, Caveats) covered by at least one question?
2. UNAMBIGUOUS GROUND TRUTH: Does each question have exactly ONE demonstrably correct answer directly verifiable from the note?
3. DISTRACTOR PLAUSIBILITY: Are distractors realistic and instructive, avoiding giveaway options?
4. QUESTION TAXONOMY: Did the author avoid lazy flashcards and utilize challenging formats (MCQ, True/False, Matching, Sequence Ordering)?

Output must strictly conform to the required JSON schema.`;

    const criticUserPrompt = `<study_note>
${note.content.slice(0, 5000)}
</study_note>

<candidate_quiz_questions>
${JSON.stringify(currentQuestions, null, 2)}
</candidate_quiz_questions>

<deterministic_issues>
${JSON.stringify(questionCheck.errors)}
</deterministic_issues>

Audit the quiz questions and output the audit report.`;

    let criticResponse: string;
    try {
      criticResponse = await client.complete({
        systemPrompt: criticSystemPrompt,
        prompt: criticUserPrompt,
        responseFormat: {
          type: 'json_schema',
          json_schema: QUIZ_AUDIT_JSON_SCHEMA
        },
        temperature: 0.1,
        timeoutMs
      });
    } catch {
      criticResponse = await client.complete({
        systemPrompt: criticSystemPrompt + '\nRespond with valid JSON object conforming to schema.',
        prompt: criticUserPrompt,
        responseFormat: { type: 'json_object' },
        temperature: 0.1,
        timeoutMs
      });
    }

    let parsedAudit: any = null;
    try {
      parsedAudit = safeParseJson<any>(criticResponse);
    } catch {
      parsedAudit = {
        passed: questionCheck.valid,
        coverageScore: questionCheck.valid ? 90 : 65,
        untestedSections: [],
        flawedQuestions: questionCheck.errors.map((e, idx) => ({ index: idx, reason: e })),
        feedback: 'Quiz critic parsing fallback.'
      };
    }

    const mergedFlawed = [
      ...(parsedAudit?.flawedQuestions || []),
      ...questionCheck.errors.map((e: string, idx: number) => ({ index: idx, reason: e }))
    ];

    const isPassed =
      Boolean(parsedAudit?.passed) &&
      (parsedAudit?.coverageScore ?? 0) >= QUIZ_PASSING_SCORE_THRESHOLD &&
      questionCheck.valid;

    lastAuditReport = {
      topicName: note.topicName,
      passed: isPassed,
      coverageScore: Number(parsedAudit?.coverageScore ?? (isPassed ? 95 : 65)),
      untestedSections: Array.isArray(parsedAudit?.untestedSections) ? parsedAudit.untestedSections : [],
      flawedQuestions: mergedFlawed,
      feedback: typeof parsedAudit?.feedback === 'string' ? parsedAudit.feedback : '',
      refinementIterations: iteration
    };

    if (isPassed || iteration >= maxIterations) {
      break;
    }

    iteration++;
  }

  const generatedQuiz: GeneratedQuiz = {
    topicName: note.topicName,
    title: `${note.title} Mastery Assessment`,
    description: `Comprehensive mastery quiz evaluating theoretical, mathematical, and implementation understanding of ${note.title}.`,
    questions: currentQuestions
  };

  return {
    quiz: generatedQuiz,
    auditReport: lastAuditReport
  };
}

/**
 * Stage 5 Generator: Synthesizes quizzes for multiple notes in parallel.
 */
export async function generateTopicQuizzes(
  notes: GeneratedNote[],
  options?: GenerateQuizOptions
): Promise<GenerateQuizResult> {
  if (!notes || notes.length === 0) {
    return { quizzes: [], auditReports: [] };
  }

  const results = await Promise.all(
    notes.map((n) => generateSingleTopicQuiz(n, options))
  );

  return {
    quizzes: results.map((r) => r.quiz),
    auditReports: results.map((r) => r.auditReport)
  };
}
