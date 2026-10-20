import { query } from '../db.js';
import { generateEntityId } from '../utils/id.js';
import { toTopicDTO } from '../utils/mappers.js';
import { formatCanonicalSolutionMarkdown } from '../utils/canonicalSolutionMarkdown.js';
import {
  ProblemRow,
  ProblemDTO,
  ProblemPrerequisiteRow,
  ProblemQuizRow,
  CreateProblemPayload,
  TopicRow,
  TopicPrerequisiteRow,
  NoteRow,
  TopicDTO,
  QuizRow,
  QuizQuestionRow,
  QuizDTO,
  QuizQuestionDTO,
  ProblemSubmissionRow,
  ProblemSubmissionDTO,
  SubmitProblemPayload,
  SystemDesignFollowUp,
  ProblemFollowUpResponseRow,
  ProblemFollowUpResponseDTO,
  SaveFollowUpResponsePayload
} from '../types.js';

export function parseJsonField<T>(field: any, defaultValue: T): T {
  if (field === null || field === undefined) return defaultValue;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return defaultValue;
    }
  }
  return field as T;
}

export function toProblemDTO(
  row: ProblemRow,
  prerequisiteTopicIds: string[] = [],
  prerequisiteTopics: TopicDTO[] = [],
  quizzes: QuizDTO[] = []
): ProblemDTO {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    difficulty: row.difficulty,
    domain: row.domain,
    summary: row.summary || '',
    prompt: row.prompt || '',
    solution: formatCanonicalSolutionMarkdown(row.solution || ''),
    hints: parseJsonField<string[]>(row.hints, []),
    starterCode: parseJsonField<Record<string, string>>(row.starter_code, {}),
    testCases: parseJsonField<Array<{ input: any; expected: any; explanation?: string }>>(row.test_cases, []),
    rubric: parseJsonField<Record<string, any>>(row.rubric, {}),
    followUps: parseJsonField<SystemDesignFollowUp[]>(row.follow_ups, []),
    targetCompanies: Array.isArray(row.target_companies) ? row.target_companies : [],
    timeLimitMinutes: Number(row.time_limit_minutes) || 45,
    prerequisiteTopicIds,
    guidedLearningPathAvailable: row.guided_learning_path_available === true,
    prerequisiteTopics: prerequisiteTopics.length > 0 ? prerequisiteTopics : undefined,
    quizzes: quizzes.length > 0 ? quizzes : undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || '')
  };
}

export interface GetProblemsFilter {
  type?: string;
  difficulty?: string;
  domain?: string;
  company?: string;
  topicId?: string;
  search?: string;
}

/**
 * List all problems with optional filtering
 */
export async function getProblems(filter?: GetProblemsFilter): Promise<ProblemDTO[]> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filter?.type) {
    params.push(filter.type);
    conditions.push(`p.type = $${params.length}`);
  }

  if (filter?.difficulty) {
    params.push(filter.difficulty);
    conditions.push(`p.difficulty = $${params.length}`);
  }

  if (filter?.domain) {
    params.push(filter.domain);
    conditions.push(`p.domain = $${params.length}`);
  }

  if (filter?.company) {
    params.push(filter.company);
    conditions.push(`$${params.length} = ANY(p.target_companies)`);
  }

  if (filter?.search) {
    params.push(`%${filter.search}%`);
    conditions.push(`(p.title ILIKE $${params.length} OR p.summary ILIKE $${params.length})`);
  }

  if (filter?.topicId) {
    params.push(filter.topicId);
    conditions.push(`p.id IN (SELECT problem_id FROM problem_prerequisites WHERE topic_id = $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const problemsRes = await query<ProblemRow>(
    `SELECT p.* FROM problems p ${whereClause} ORDER BY p.created_at DESC`,
    params
  );

  const problems = problemsRes.rows || [];
  if (problems.length === 0) return [];

  // Batch load all prerequisites for the found problems
  const problemIds = problems.map((p) => p.id);
  const problemPlaceholders = problemIds.map((_, i) => `$${i + 1}`).join(', ');
  const prereqRes = await query<ProblemPrerequisiteRow>(
    `SELECT problem_id, topic_id FROM problem_prerequisites WHERE problem_id IN (${problemPlaceholders})`,
    problemIds
  );

  const prereqMap = new Map<string, string[]>();
  prereqRes.rows.forEach((r) => {
    if (!prereqMap.has(r.problem_id)) prereqMap.set(r.problem_id, []);
    prereqMap.get(r.problem_id)!.push(r.topic_id);
  });

  const learningPathsRes = await query<{ problem_id: string }>(
    `SELECT DISTINCT problem_id FROM problem_learning_paths WHERE publication_status IN ('PILOT', 'PUBLISHED')`
  );
  const learningPathIds = new Set(learningPathsRes.rows.map((row) => row.problem_id));
  return problems.map((p) => ({
    ...toProblemDTO(p, prereqMap.get(p.id) || []),
    guidedLearningPathAvailable: learningPathIds.has(p.id)
  }));
}

/**
 * Retrieve a single problem with fully hydrated prerequisite topics and attached quizzes
 */
export async function getProblemById(id: string): Promise<ProblemDTO | null> {
  const problemRes = await query<ProblemRow>('SELECT * FROM problems WHERE id = $1', [id]);
  if (!problemRes.rows || problemRes.rows.length === 0) {
    return null;
  }

  const problem = problemRes.rows[0];
  const learningPathRes = await query<{ problem_id: string }>(
    `SELECT problem_id FROM problem_learning_paths WHERE problem_id = $1 AND publication_status IN ('PILOT', 'PUBLISHED') LIMIT 1`, [id]
  );
  problem.guided_learning_path_available = learningPathRes.rows.length > 0;

  // 1. Fetch prerequisite topic IDs
  const prereqRes = await query<ProblemPrerequisiteRow>(
    'SELECT topic_id FROM problem_prerequisites WHERE problem_id = $1',
    [id]
  );
  const topicIds = prereqRes.rows.map((r) => r.topic_id);

  let prerequisiteTopics: TopicDTO[] = [];
  if (topicIds.length > 0) {
    const topicPlaceholders = topicIds.map((_, i) => `$${i + 1}`).join(', ');
    const [topicsRes, edgesRes, notesRes] = await Promise.all([
      query<TopicRow>(`SELECT * FROM topics WHERE id IN (${topicPlaceholders})`, topicIds),
      query<TopicPrerequisiteRow>(
        `SELECT topic_id, prerequisite_id FROM topic_prerequisites WHERE topic_id IN (${topicPlaceholders}) OR prerequisite_id IN (${topicPlaceholders})`,
        topicIds
      ),
      query<NoteRow>(`SELECT * FROM notes WHERE topic_id IN (${topicPlaceholders})`, topicIds)
    ]);

    const prereqMap = new Map<string, string[]>();
    const unlockMap = new Map<string, string[]>();
    edgesRes.rows.forEach((edge) => {
      if (!prereqMap.has(edge.topic_id)) prereqMap.set(edge.topic_id, []);
      prereqMap.get(edge.topic_id)!.push(edge.prerequisite_id);

      if (!unlockMap.has(edge.prerequisite_id)) unlockMap.set(edge.prerequisite_id, []);
      unlockMap.get(edge.prerequisite_id)!.push(edge.topic_id);
    });

    const noteMap = new Map<string, any[]>();
    notesRes.rows.forEach((n) => {
      if (!noteMap.has(n.topic_id)) noteMap.set(n.topic_id, []);
      noteMap.get(n.topic_id)!.push({
        id: n.id,
        title: n.title,
        filename: n.filename || undefined,
        content: n.content
      });
    });

    prerequisiteTopics = topicsRes.rows.map((t) =>
      toTopicDTO(
        t,
        prereqMap.get(t.id) || [],
        unlockMap.get(t.id) || [],
        noteMap.get(t.id) || []
      )
    );
  }

  // 2. Fetch attached quizzes
  const quizLinksRes = await query<ProblemQuizRow>(
    'SELECT quiz_id FROM problem_quizzes WHERE problem_id = $1',
    [id]
  );
  const quizIds = quizLinksRes.rows.map((r) => r.quiz_id);

  let quizzes: QuizDTO[] = [];
  if (quizIds.length > 0) {
    const quizPlaceholders = quizIds.map((_, i) => `$${i + 1}`).join(', ');
    const [quizzesRes, questionsRes] = await Promise.all([
      query<QuizRow>(`SELECT * FROM quizzes WHERE id IN (${quizPlaceholders})`, quizIds),
      query<QuizQuestionRow>(`SELECT * FROM quiz_questions WHERE quiz_id IN (${quizPlaceholders}) ORDER BY id ASC`, quizIds)
    ]);

    const questionMap = new Map<string, QuizQuestionDTO[]>();
    questionsRes.rows.forEach((q) => {
      if (!questionMap.has(q.quiz_id)) questionMap.set(q.quiz_id, []);
      questionMap.get(q.quiz_id)!.push({
        id: q.id,
        quizId: q.quiz_id,
        noteId: q.note_id || undefined,
        type: q.type,
        prompt: q.prompt,
        payload: q.payload,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        createdAt: q.created_at instanceof Date ? q.created_at.toISOString() : String(q.created_at)
      });
    });

    quizzes = quizzesRes.rows.map((q) => ({
      id: q.id,
      topicId: q.topic_id,
      sourceId: q.source_id || undefined,
      title: q.title,
      description: q.description || undefined,
      questions: questionMap.get(q.id) || [],
      createdAt: q.created_at instanceof Date ? q.created_at.toISOString() : String(q.created_at),
      updatedAt: q.updated_at instanceof Date ? q.updated_at.toISOString() : String(q.updated_at)
    }));
  }

  return toProblemDTO(problem, topicIds, prerequisiteTopics, quizzes);
}

/**
 * Create a new interview problem
 */
export async function createProblem(payload: CreateProblemPayload): Promise<ProblemDTO> {
  const id = payload.id || generateEntityId('PROB');
  const targetCompanies = payload.targetCompanies || [];
  const hints = JSON.stringify(payload.hints || []);
  const starterCode = JSON.stringify(payload.starterCode || {});
  const testCases = JSON.stringify(payload.testCases || []);
  const rubric = JSON.stringify(payload.rubric || {});
  const followUps = JSON.stringify(payload.followUps || []);
  const timeLimit = Number(payload.timeLimitMinutes) || 45;

  const res = await query<ProblemRow>(
    `INSERT INTO problems (
      id, title, type, difficulty, domain, summary, prompt, solution,
      hints, starter_code, test_cases, rubric, follow_ups, target_companies, time_limit_minutes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
    RETURNING *`,
    [
      id,
      payload.title,
      payload.type,
      payload.difficulty,
      payload.domain,
      payload.summary,
      payload.prompt,
      payload.solution,
      hints,
      starterCode,
      testCases,
      rubric,
      followUps,
      targetCompanies,
      timeLimit
    ]
  );

  const created = res.rows[0];

  // Insert prerequisites (if topic exists in DB)
  const topicIds = payload.prerequisiteTopicIds || [];
  if (topicIds.length > 0) {
    for (const topicId of topicIds) {
      const topicExists = await query('SELECT id FROM topics WHERE id = $1', [topicId]);
      if (topicExists.rows && topicExists.rows.length > 0) {
        await query(
          `INSERT INTO problem_prerequisites (problem_id, topic_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, topicId]
        );
      }
    }
  }

  // Insert quiz links (if quiz exists in DB)
  const quizIds = payload.quizIds || [];
  if (quizIds.length > 0) {
    for (const quizId of quizIds) {
      const quizExists = await query('SELECT id FROM quizzes WHERE id = $1', [quizId]);
      if (quizExists.rows && quizExists.rows.length > 0) {
        await query(
          `INSERT INTO problem_quizzes (problem_id, quiz_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, quizId]
        );
      }
    }
  }

  return (await getProblemById(id))!;
}

/**
 * Update an existing interview problem
 */
export async function updateProblem(
  id: string,
  payload: Partial<CreateProblemPayload>
): Promise<ProblemDTO | null> {
  const existing = await query<ProblemRow>('SELECT * FROM problems WHERE id = $1', [id]);
  if (!existing.rows || existing.rows.length === 0) {
    return null;
  }

  const current = existing.rows[0];
  const title = payload.title !== undefined ? payload.title : current.title;
  const type = payload.type !== undefined ? payload.type : current.type;
  const difficulty = payload.difficulty !== undefined ? payload.difficulty : current.difficulty;
  const domain = payload.domain !== undefined ? payload.domain : current.domain;
  const summary = payload.summary !== undefined ? payload.summary : current.summary;
  const prompt = payload.prompt !== undefined ? payload.prompt : current.prompt;
  const solution = payload.solution !== undefined ? payload.solution : current.solution;
  const hints = payload.hints !== undefined ? JSON.stringify(payload.hints) : JSON.stringify(current.hints);
  const starterCode =
    payload.starterCode !== undefined ? JSON.stringify(payload.starterCode) : JSON.stringify(current.starter_code);
  const testCases =
    payload.testCases !== undefined ? JSON.stringify(payload.testCases) : JSON.stringify(current.test_cases);
  const rubric = payload.rubric !== undefined ? JSON.stringify(payload.rubric) : JSON.stringify(current.rubric);
  const followUps =
    payload.followUps !== undefined ? JSON.stringify(payload.followUps) : JSON.stringify(current.follow_ups);
  const targetCompanies = payload.targetCompanies !== undefined ? payload.targetCompanies : current.target_companies;
  const timeLimit = payload.timeLimitMinutes !== undefined ? payload.timeLimitMinutes : current.time_limit_minutes;

  await query(
    `UPDATE problems
     SET title = $1, type = $2, difficulty = $3, domain = $4, summary = $5, prompt = $6, solution = $7,
         hints = $8, starter_code = $9, test_cases = $10, rubric = $11, follow_ups = $12, target_companies = $13,
         time_limit_minutes = $14, updated_at = NOW()
     WHERE id = $15`,
    [
      title,
      type,
      difficulty,
      domain,
      summary,
      prompt,
      solution,
      hints,
      starterCode,
      testCases,
      rubric,
      followUps,
      targetCompanies,
      timeLimit,
      id
    ]
  );

  // Update prerequisites if explicitly provided
  if (payload.prerequisiteTopicIds !== undefined) {
    await query('DELETE FROM problem_prerequisites WHERE problem_id = $1', [id]);
    for (const topicId of payload.prerequisiteTopicIds) {
      const topicExists = await query('SELECT id FROM topics WHERE id = $1', [topicId]);
      if (topicExists.rows && topicExists.rows.length > 0) {
        await query(
          `INSERT INTO problem_prerequisites (problem_id, topic_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, topicId]
        );
      }
    }
  }

  // Update quizzes if explicitly provided
  if (payload.quizIds !== undefined) {
    await query('DELETE FROM problem_quizzes WHERE problem_id = $1', [id]);
    for (const quizId of payload.quizIds) {
      const quizExists = await query('SELECT id FROM quizzes WHERE id = $1', [quizId]);
      if (quizExists.rows && quizExists.rows.length > 0) {
        await query(
          `INSERT INTO problem_quizzes (problem_id, quiz_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, quizId]
        );
      }
    }
  }

  return await getProblemById(id);
}

/**
 * Delete an interview problem
 */
export async function deleteProblem(id: string): Promise<boolean> {
  const res = await query('DELETE FROM problems WHERE id = $1 RETURNING id', [id]);
  return (res.rowCount || 0) > 0;
}

export function toSubmissionDTO(row: ProblemSubmissionRow): ProblemSubmissionDTO {
  return {
    id: row.id,
    problemId: row.problem_id,
    language: row.language,
    code: row.code,
    status: row.status,
    passedCount: Number(row.passed_count) || 0,
    totalCount: Number(row.total_count) || 0,
    runtimeMs: Number(row.runtime_ms) || 0,
    memoryKb: Number(row.memory_kb) || 0,
    failedTestCase: parseJsonField(row.failed_test_case, null),
    stdout: row.stdout || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || '')
  };
}

/**
 * Record a submission and execution result for a problem
 */
export async function createSubmission(
  problemId: string,
  payload: SubmitProblemPayload
): Promise<ProblemSubmissionDTO> {
  const submissionId = generateEntityId('SUB');
  const status = payload.status || 'ACCEPTED';
  const passedCount = payload.passedCount ?? 0;
  const totalCount = payload.totalCount ?? 0;
  const runtimeMs = payload.runtimeMs ?? 0;
  const memoryKb = payload.memoryKb ?? 36500;
  const failedTestCase = payload.failedTestCase ? JSON.stringify(payload.failedTestCase) : null;
  const stdout = payload.stdout || null;

  const result = await query<ProblemSubmissionRow>(
    `INSERT INTO problem_submissions (
      id, problem_id, language, code, status, passed_count, total_count, runtime_ms, memory_kb, failed_test_case, stdout
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      submissionId,
      problemId,
      payload.language,
      payload.code,
      status,
      passedCount,
      totalCount,
      runtimeMs,
      memoryKb,
      failedTestCase,
      stdout
    ]
  );

  return toSubmissionDTO(result.rows[0]);
}

/**
 * Retrieve past submissions for a problem ordered chronologically descending
 */
export async function getSubmissionsByProblemId(problemId: string): Promise<ProblemSubmissionDTO[]> {
  const result = await query<ProblemSubmissionRow>(
    `SELECT * FROM problem_submissions
     WHERE problem_id = $1
     ORDER BY created_at DESC`,
    [problemId]
  );

  return (result.rows || []).map(toSubmissionDTO);
}

export function toFollowUpResponseDTO(row: ProblemFollowUpResponseRow): ProblemFollowUpResponseDTO {
  return {
    id: row.id,
    problemId: row.problem_id,
    followUpId: row.follow_up_id,
    responseText: row.response_text || '',
    diagramData: parseJsonField(row.diagram_data, null),
    score: row.score !== null && row.score !== undefined ? Number(row.score) : null,
    feedback: row.feedback || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || '')
  };
}

/**
 * Retrieve candidate follow-up architecture responses for a problem
 */
export async function getFollowUpResponses(problemId: string): Promise<ProblemFollowUpResponseDTO[]> {
  const result = await query<ProblemFollowUpResponseRow>(
    `SELECT * FROM problem_follow_up_responses
     WHERE problem_id = $1
     ORDER BY updated_at DESC`,
    [problemId]
  );

  return (result.rows || []).map(toFollowUpResponseDTO);
}

/**
 * Retrieve candidate follow-up response for a specific challenge
 */
export async function getFollowUpResponse(
  problemId: string,
  followUpId: string
): Promise<ProblemFollowUpResponseDTO | null> {
  const result = await query<ProblemFollowUpResponseRow>(
    `SELECT * FROM problem_follow_up_responses
     WHERE problem_id = $1 AND follow_up_id = $2`,
    [problemId, followUpId]
  );

  if (!result.rows || result.rows.length === 0) return null;
  return toFollowUpResponseDTO(result.rows[0]);
}

/**
 * Upsert candidate follow-up architecture response (draft or submitted)
 */
export async function saveFollowUpResponse(
  problemId: string,
  followUpId: string,
  payload: SaveFollowUpResponsePayload
): Promise<ProblemFollowUpResponseDTO> {
  const id = generateEntityId('RESP');
  const responseText = payload.responseText ?? '';
  const diagramData = payload.diagramData ? JSON.stringify(payload.diagramData) : null;
  const score = payload.score !== undefined && payload.score !== null ? payload.score : null;
  const feedback = payload.feedback || null;

  const result = await query<ProblemFollowUpResponseRow>(
    `INSERT INTO problem_follow_up_responses (
       id, problem_id, follow_up_id, response_text, diagram_data, score, feedback, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (problem_id, follow_up_id)
     DO UPDATE SET
       response_text = EXCLUDED.response_text,
       diagram_data = COALESCE(EXCLUDED.diagram_data, problem_follow_up_responses.diagram_data),
       score = COALESCE(EXCLUDED.score, problem_follow_up_responses.score),
       feedback = COALESCE(EXCLUDED.feedback, problem_follow_up_responses.feedback),
       updated_at = NOW()
     RETURNING *`,
    [id, problemId, followUpId, responseText, diagramData, score, feedback]
  );

  return toFollowUpResponseDTO(result.rows[0]);
}

