import { query } from '../db.js';
import { generateEntityId } from '../utils/id.js';
import {
  InterviewLearningPath,
  InterviewLearningAttempt,
  LearningAttemptEvent,
  LearningAttemptEventInput
} from '../types.js';
import { TRAPPING_RAIN_WATER_LEARNING_PATH } from '../data/trappingRainWaterLearningPath.js';
import { FAULT_TOLERANT_WORK_QUEUE_LEARNING_PATH } from '../data/faultTolerantWorkQueueLearningPath.js';
import { validateQueueProblemBreakdown } from './interviewProblemBreakdownPipeline.js';
import { CanonicalProblemSource } from '../utils/problemSource.js';

const EVENT_TYPES = new Set([
  'STARTED', 'INITIAL_ATTEMPT', 'DIAGNOSTIC_RESPONSE', 'STAGE_RESPONSE', 'STAGE_VERIFIED',
  'HINT_REQUESTED', 'SOLUTION_REVEALED', 'TRANSFER_RESPONSE',
  'CONFIDENCE_RECORDED', 'COMPLETED'
]);

export function validateInterviewLearningPath(value: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, errors: ['Learning path must be an object.'] };
  }
  const path = value as Partial<InterviewLearningPath>;
  if (typeof path.problemId !== 'string' || !path.problemId.trim()) errors.push('problemId is required.');
  if (!Number.isInteger(path.version) || (path.version ?? 0) < 1) errors.push('version must be a positive integer.');
  if (!['PILOT', 'PUBLISHED', 'RETIRED'].includes(String(path.publicationStatus))) errors.push('publicationStatus is invalid.');
  if (!path.interpretation || typeof path.interpretation.goal !== 'string' || !path.interpretation.goal.trim()) {
    errors.push('interpretation.goal is required.');
  }
  if (!Array.isArray(path.interpretation?.constraints) || path.interpretation.constraints.length === 0 ||
      path.interpretation.constraints.some((item) => typeof item !== 'string' || !item.trim())) {
    errors.push('interpretation.constraints must contain non-empty strings.');
  }
  if (!Array.isArray(path.interpretation?.observations) || path.interpretation.observations.length === 0 ||
      path.interpretation.observations.some((item) => typeof item !== 'string' || !item.trim())) {
    errors.push('interpretation.observations must contain non-empty strings.');
  }
  if (!Array.isArray(path.concepts) || path.concepts.length === 0) errors.push('At least one concept is required.');
  if (!Array.isArray(path.reasoningStages) || path.reasoningStages.length < 2) errors.push('At least two reasoning stages are required.');
  if (!Array.isArray(path.implementationPlan) || path.implementationPlan.length === 0) errors.push('implementationPlan is required.');
  if (!Array.isArray(path.edgeCases) || (path.edgeCases.length === 0 && !path.problemBreakdown)) errors.push('At least one edge case or a validated problem breakdown is required.');
  if (!Array.isArray(path.assessmentRubric) || path.assessmentRubric.length === 0) errors.push('assessmentRubric is required.');
  if (!path.transferExercise?.prompt?.trim() || !path.transferExercise?.changedConstraint?.trim()) errors.push('A transfer exercise with a changed constraint is required.');
  if (!path.qualityReview || !['PILOT_REVIEWED', 'NEEDS_REVIEW'].includes(path.qualityReview.status)) errors.push('qualityReview.status is required.');

  const concepts = Array.isArray(path.concepts) ? path.concepts : [];
  const conceptIds = new Set(concepts.map((concept) => concept?.id));
  for (const concept of concepts) {
    if (!concept?.id || !concept.name?.trim() || !concept.intuition?.trim() || !concept.relevance?.trim() ||
        !concept.diagnosticQuestion?.trim() || !concept.diagnosticSuccessCriteria?.trim()) {
      errors.push(`Concept '${concept?.id || '(unknown)'}' is incomplete.`);
    }
    if (concept?.topicId !== undefined && (typeof concept.topicId !== 'string' || !concept.topicId.trim())) {
      errors.push(`Concept '${concept?.id || '(unknown)'}' has an invalid topic reference.`);
    }
    if (concept?.terms !== undefined && (!Array.isArray(concept.terms) || concept.terms.some((term) => typeof term !== 'string' || !term.trim()))) {
      errors.push(`Concept '${concept?.id || '(unknown)'}' has invalid phrase aliases.`);
    }
  }
  for (const resource of Array.isArray(path.resources) ? path.resources : []) {
    if (!resource || typeof resource !== 'object') {
      errors.push('Resources must be objects with a title, URL, and concept reference.');
      continue;
    }
    try {
      const url = new URL(resource.url);
      if (!['http:', 'https:'].includes(url.protocol)) errors.push(`Resource '${resource.title}' must use HTTP or HTTPS.`);
    } catch {
      errors.push(`Resource '${resource.title}' has an invalid URL.`);
    }
    if (!resource.verified) errors.push(`Resource '${resource.title}' has not been verified.`);
    if (!conceptIds.has(resource.conceptId)) errors.push(`Resource '${resource.title}' references an unknown concept.`);
  }
  for (const stage of Array.isArray(path.reasoningStages) ? path.reasoningStages : []) {
    if (!stage?.id || !stage.title?.trim() || !stage.purpose?.trim() || !stage.learnerPrompt?.trim() ||
        !stage.hint?.trim() || !stage.expectedOutcome?.trim() || !Array.isArray(stage.verificationCriteria) ||
        stage.verificationCriteria.length === 0) {
      errors.push(`Reasoning stage '${stage?.id || '(unknown)'}' is incomplete.`);
    }
  }
  for (const step of Array.isArray(path.implementationPlan) ? path.implementationPlan : []) {
    if (!step?.id || !step.task?.trim() || !step.verification?.trim()) errors.push(`Implementation step '${step?.id || '(unknown)'}' is incomplete.`);
  }
  for (const example of Array.isArray(path.edgeCases) ? path.edgeCases : []) {
    if (!example || !Array.isArray(example.input) || example.input.some((height) => !Number.isFinite(height) || height < 0) ||
        !Number.isFinite(example.expected) || example.expected < 0 || !example.why?.trim()) {
      errors.push('Every edge case must contain non-negative numeric heights, an expected volume, and an explanation.');
    }
  }
  for (const alternative of Array.isArray(path.alternatives) ? path.alternatives : []) {
    if (!alternative?.name?.trim() || !alternative.time?.trim() || !alternative.space?.trim() || !alternative.tradeoff?.trim()) {
      errors.push(`Alternative '${alternative?.name || '(unknown)'}' is incomplete.`);
    }
  }
  if (!Array.isArray(path.transferExercise?.assessmentCriteria) || path.transferExercise.assessmentCriteria.length === 0 ||
      path.transferExercise.assessmentCriteria.some((criterion) => typeof criterion !== 'string' || !criterion.trim())) {
    errors.push('transferExercise.assessmentCriteria must contain non-empty strings.');
  }
  for (const criterion of Array.isArray(path.assessmentRubric) ? path.assessmentRubric : []) {
    if (!criterion?.criterion?.trim() || !criterion.evidence?.trim()) errors.push('Every assessment rubric criterion needs an evidence description.');
  }
  if (path.initialAttemptPrompt !== undefined && !path.initialAttemptPrompt.trim()) errors.push('initialAttemptPrompt must be non-empty when provided.');
  return { valid: errors.length === 0, errors };
}

async function getCanonicalSource(problemId: string): Promise<CanonicalProblemSource | null> {
  const result = await query<CanonicalProblemSource>(
    'SELECT id, title, prompt, solution FROM problems WHERE id = $1', [problemId]
  );
  return result.rows[0] || null;
}

export async function saveLearningPath(path: InterviewLearningPath): Promise<void> {
  const validation = validateInterviewLearningPath(path);
  if (!validation.valid) throw new Error(`Invalid learning path: ${validation.errors.join(' ')}`);
  if (path.qualityReview.status !== 'PILOT_REVIEWED') throw new Error('Learning path requires a completed pilot review.');
  let report = { valid: true, pilotReady: true, sourceFingerprint: '', errors: [] as string[], warnings: [] as string[] };
  if (path.problemBreakdown) {
    const source = await getCanonicalSource(path.problemId);
    if (!source) throw new Error(`Canonical problem '${path.problemId}' was not found.`);
    report = validateQueueProblemBreakdown(source, path.problemBreakdown);
    if (!report.valid || !report.pilotReady) throw new Error(`Invalid problem breakdown: ${[...report.errors, ...report.warnings].join(' ')}`);
  }
  for (const concept of path.concepts) {
    if (!concept.topicId) continue;
    const topic = await query<{ id: string }>('SELECT id FROM topics WHERE id = $1', [concept.topicId]);
    if (topic.rows.length === 0) throw new Error(`Concept '${concept.id}' references unknown topic '${concept.topicId}'.`);
  }
  await query(
    `INSERT INTO problem_learning_paths (problem_id, version, publication_status, content, validation_errors, validation_report)
     VALUES ($1, $2, $3, $4, '[]'::jsonb, $5)
     ON CONFLICT (problem_id, version) DO NOTHING`,
    [path.problemId, path.version, path.publicationStatus, JSON.stringify(path), JSON.stringify({ ...report, checkedAt: new Date().toISOString() })]
  );
}

export async function seedCuratedLearningPaths(): Promise<void> {
  await saveLearningPath(TRAPPING_RAIN_WATER_LEARNING_PATH);
  await saveLearningPath(FAULT_TOLERANT_WORK_QUEUE_LEARNING_PATH);
}

export async function getInterviewLearningPath(problemId: string): Promise<InterviewLearningPath | null> {
  const result = await query<{ content: InterviewLearningPath; validation_errors: unknown; publication_status: string; version: number; id: string; title: string; prompt: string; solution: string }>(
    `SELECT lp.content, lp.validation_errors, lp.publication_status, lp.version, p.id, p.title, p.prompt, p.solution
       FROM problem_learning_paths lp JOIN problems p ON p.id = lp.problem_id
      WHERE lp.problem_id = $1 AND lp.publication_status IN ('PILOT', 'PUBLISHED')
      ORDER BY lp.version DESC LIMIT 1`,
    [problemId]
  );
  const row = result.rows[0];
  if (!row || (Array.isArray(row.validation_errors) && row.validation_errors.length > 0)) return null;
  const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
  const validation = validateInterviewLearningPath(content);
  if (content.problemBreakdown) {
    const report = validateQueueProblemBreakdown({ id: row.id, title: row.title, prompt: row.prompt, solution: row.solution }, content.problemBreakdown);
    if (!report.valid || !report.pilotReady) return null;
  }
  return content.qualityReview.status === 'PILOT_REVIEWED' && validation.valid && content.problemId === problemId && Number(content.version) === Number(row.version) &&
    content.publicationStatus === row.publication_status ? content : null;
}

export async function startInterviewLearningAttempt(problemId: string): Promise<InterviewLearningAttempt> {
  const path = await getInterviewLearningPath(problemId);
  if (!path) throw new Error('No validated pilot learning path is available for this problem.');
  const id = generateEntityId('ATTEMPT');
  const result = await query<any>(
    `INSERT INTO interview_learning_attempts (id, problem_id, path_version)
     VALUES ($1, $2, $3) RETURNING *`,
    [id, problemId, path.version]
  );
  await recordLearningAttemptEvent(id, { eventType: 'STARTED' });
  return toAttemptDTO(result.rows[0]);
}

export async function recordLearningAttemptEvent(
  attemptId: string,
  input: LearningAttemptEventInput,
  expectedProblemId?: string
): Promise<LearningAttemptEvent> {
  if (!EVENT_TYPES.has(input.eventType)) throw new Error('Unsupported learning attempt event.');
  const payload = input.payload || {};
  if (typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Event payload must be an object.');
  if (JSON.stringify(payload).length > 10000) throw new Error('Event payload is too large.');
  if (input.stageId && !/^[a-z0-9-]{1,64}$/i.test(input.stageId)) throw new Error('stageId is invalid.');
  if (input.eventType === 'CONFIDENCE_RECORDED') {
    const confidence = payload.confidence;
    if (!Number.isInteger(confidence) || Number(confidence) < 1 || Number(confidence) > 5) {
      throw new Error('confidence must be an integer from 1 to 5.');
    }
  }
  if (['INITIAL_ATTEMPT', 'STAGE_RESPONSE', 'DIAGNOSTIC_RESPONSE', 'TRANSFER_RESPONSE'].includes(input.eventType)) {
    const response = payload.response;
    if (typeof response !== 'string' || response.length > 5000) throw new Error('response must be text up to 5000 characters.');
  }

  const attemptRes = await query<any>('SELECT * FROM interview_learning_attempts WHERE id = $1', [attemptId]);
  const attempt = attemptRes.rows[0];
  if (!attempt) throw new Error('Learning attempt not found.');
  if (expectedProblemId && attempt.problem_id !== expectedProblemId) throw new Error('Learning attempt does not belong to this problem.');
  if (attempt.completed_at && input.eventType !== 'CONFIDENCE_RECORDED') throw new Error('Learning attempt is already complete.');
  if (input.stageId && ['STAGE_RESPONSE', 'STAGE_VERIFIED', 'HINT_REQUESTED'].includes(input.eventType)) {
    const path = await getInterviewLearningPath(attempt.problem_id);
    if (!path || path.version !== Number(attempt.path_version) || !path.reasoningStages.some((stage) => stage.id === input.stageId)) {
      throw new Error('stageId is not part of the attempt learning path.');
    }
  }
  if (input.eventType === 'COMPLETED') {
    const path = await getInterviewLearningPath(attempt.problem_id);
    const priorEvents = await query<{ event_type: string; stage_id: string | null }>(
      'SELECT event_type, stage_id FROM interview_learning_attempt_events WHERE attempt_id = $1', [attemptId]
    );
    const verified = new Set(priorEvents.rows.filter((event) => event.event_type === 'STAGE_VERIFIED').map((event) => event.stage_id).filter(Boolean));
    const hasTransfer = priorEvents.rows.some((event) => event.event_type === 'TRANSFER_RESPONSE');
    if (!path || verified.size !== path.reasoningStages.length || !hasTransfer) {
      throw new Error('Complete every reasoning stage and save a transfer response before finishing the attempt.');
    }
  }

  const inserted = await query<any>(
    `INSERT INTO interview_learning_attempt_events (id, attempt_id, event_type, stage_id, payload)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [generateEntityId('RESP'), attemptId, input.eventType, input.stageId || null, JSON.stringify(payload)]
  );
  if (input.eventType === 'CONFIDENCE_RECORDED') {
    await query('UPDATE interview_learning_attempts SET self_confidence = $1 WHERE id = $2', [payload.confidence, attemptId]);
  }
  if (input.eventType === 'COMPLETED') {
    const events = await query<{ event_type: string; stage_id: string | null }>(
      'SELECT event_type, stage_id FROM interview_learning_attempt_events WHERE attempt_id = $1', [attemptId]
    );
    const path = await getInterviewLearningPath(attempt.problem_id);
    const verifiedStages = new Set(events.rows.filter((event) => event.event_type === 'STAGE_VERIFIED').map((event) => event.stage_id).filter(Boolean));
    const hasTransfer = events.rows.some((event) => event.event_type === 'TRANSFER_RESPONSE');
    const hasHints = events.rows.filter((event) => event.event_type === 'HINT_REQUESTED').length > 0;
    const confidenceRes = await query<{ self_confidence: number | null }>(
      'SELECT self_confidence FROM interview_learning_attempts WHERE id = $1', [attemptId]
    );
    const confidence = Number(confidenceRes.rows[0]?.self_confidence || 0);
    const completedAllStages = Boolean(path && verifiedStages.size === path.reasoningStages.length);
    const days = hasTransfer && completedAllStages && !hasHints && confidence >= 4 ? 3 : 1;
    const startedAt = new Date(attempt.started_at).getTime();
    const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    const reviewDueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    await query(
      `UPDATE interview_learning_attempts
          SET completed_at = NOW(), duration_seconds = $1, review_due_at = $2
        WHERE id = $3`,
      [durationSeconds, reviewDueAt, attemptId]
    );
  }
  return toEventDTO(inserted.rows[0]);
}

export async function getInterviewLearningAttempts(problemId: string): Promise<InterviewLearningAttempt[]> {
  const result = await query<any>(
    `SELECT * FROM interview_learning_attempts WHERE problem_id = $1 ORDER BY started_at DESC`, [problemId]
  );
  return result.rows.map(toAttemptDTO);
}

function toAttemptDTO(row: any): InterviewLearningAttempt {
  return {
    id: row.id,
    problemId: row.problem_id,
    pathVersion: Number(row.path_version),
    startedAt: row.started_at instanceof Date ? row.started_at.toISOString() : String(row.started_at),
    completedAt: row.completed_at ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : String(row.completed_at)) : null,
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    selfConfidence: row.self_confidence == null ? null : Number(row.self_confidence),
    reviewDueAt: row.review_due_at ? (row.review_due_at instanceof Date ? row.review_due_at.toISOString() : String(row.review_due_at)) : null
  };
}

function toEventDTO(row: any): LearningAttemptEvent {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    eventType: row.event_type,
    stageId: row.stage_id,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  };
}
