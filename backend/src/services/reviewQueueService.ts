import { query, getClient } from '../db.js';
import {
  GraphUpdate,
  ReviewQueueItemDTO,
  ReviewQueueResponseDTO,
  RequestChangesPayload,
  IngestReviewQueueRow,
  GraphUpdateStatus
} from '../types.js';
import { reDraftNoteWithFeedback } from './contentMerger.js';
import { generateEntityId } from '../utils/id.js';

/**
 * Normalizes raw database row into ReviewQueueItemDTO with typed updates.
 */
function normalizeQueueRow(row: IngestReviewQueueRow): ReviewQueueItemDTO {
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
  const auditReport = typeof row.audit_report === 'string' ? JSON.parse(row.audit_report) : (row.audit_report || {});
  const walkthrough = payload.walkthrough || undefined;
  const sourceMetadata = payload.sourceMetadata || undefined;
  const rawUpdates: GraphUpdate[] = Array.isArray(payload.graphUpdates) ? payload.graphUpdates : [];

  const updates = rawUpdates.map((u) => ({
    ...u,
    sourceUrl: u.sourceUrl || row.source_url,
    sourceTitle: u.sourceTitle || sourceMetadata?.title || u.title,
    queueId: u.queueId || row.id
  }));

  return {
    id: row.id,
    sourceUrl: row.source_url,
    status: row.status as GraphUpdateStatus,
    payload,
    auditReport,
    walkthrough,
    sourceMetadata,
    createdAt: typeof row.created_at === 'string' ? row.created_at : row.created_at?.toISOString() || new Date().toISOString(),
    reviewedAt: row.reviewed_at ? (typeof row.reviewed_at === 'string' ? row.reviewed_at : row.reviewed_at.toISOString()) : null,
    updates
  };
}

/**
 * Fetches review queue items and aggregates updates and status counts.
 */
export async function getReviewQueue(filters?: { status?: string }): Promise<ReviewQueueResponseDTO> {
  let sql = `SELECT id, source_url, status, payload, audit_report, created_at, reviewed_at FROM ingest_review_queue`;
  const params: any[] = [];

  if (filters?.status && filters.status !== 'ALL') {
    sql += ` WHERE status = $1`;
    params.push(filters.status);
  }

  sql += ` ORDER BY created_at DESC`;

  const result = await query<IngestReviewQueueRow>(sql, params);
  const queueItems = (result.rows || []).map(normalizeQueueRow);

  const updates: GraphUpdate[] = [];
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let changesRequestedCount = 0;

  for (const item of queueItems) {
    if (item.status === 'PENDING') pendingCount++;
    else if (item.status === 'APPROVED') approvedCount++;
    else if (item.status === 'REJECTED') rejectedCount++;
    else if (item.status === 'CHANGES_REQUESTED') changesRequestedCount++;

    for (const update of item.updates) {
      updates.push(update);
    }
  }

  return {
    queueItems,
    updates,
    counts: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      changesRequested: changesRequestedCount,
      total: queueItems.length
    }
  };
}

/**
 * Locates a single GraphUpdate and its parent queue item by update ID.
 */
export async function getUpdateById(
  updateId: string
): Promise<{ queueItem: ReviewQueueItemDTO; update: GraphUpdate } | null> {
  const result = await query<IngestReviewQueueRow>(
    `SELECT id, source_url, status, payload, audit_report, created_at, reviewed_at
     FROM ingest_review_queue
     ORDER BY created_at DESC`
  );

  for (const rawRow of result.rows || []) {
    const item = normalizeQueueRow(rawRow);
    const found = item.updates.find((u) => u.id === updateId);
    if (found) {
      return { queueItem: item, update: found };
    }
  }

  return null;
}

/**
 * Applies a verified GraphUpdate directly to the database tables:
 * - NOTE_UPDATE -> notes
 * - TOPIC_UPDATE -> topics
 * - QUIZ_UPDATE -> quizzes & quiz_questions
 * - EDGE_UPDATE -> topic_prerequisites
 */
export async function applyGraphUpdateToDatabase(
  update: GraphUpdate,
  customQueryFn?: (text: string, params?: any[]) => Promise<any>
): Promise<void> {
  const queryFn = customQueryFn || query;

  switch (update.type) {
    case 'NOTE_UPDATE': {
      const topicId = update.payload?.topicId || update.targetId;
      const title = update.title || update.targetName || 'Study Note';
      const content = update.newContent;

      if (update.payload?.noteId) {
        const existing = await queryFn(`SELECT id FROM notes WHERE id = $1`, [update.payload.noteId]);
        if (existing.rows && existing.rows.length > 0) {
          await queryFn(
            `UPDATE notes SET content = $1, title = COALESCE($2, title), updated_at = NOW() WHERE id = $3`,
            [content, title, update.payload.noteId]
          );
          break;
        }
      }

      // Check if note exists for this topic
      const existingByTopic = await queryFn(`SELECT id FROM notes WHERE topic_id = $1`, [topicId]);
      if (existingByTopic.rows && existingByTopic.rows.length > 0) {
        await queryFn(
          `UPDATE notes SET content = $1, title = COALESCE($2, title), updated_at = NOW() WHERE id = $3`,
          [content, title, existingByTopic.rows[0].id]
        );
      } else {
        const noteId = update.payload?.noteId || generateEntityId('NOTE');
        await queryFn(
          `INSERT INTO notes (id, topic_id, title, content, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [noteId, topicId, title, content]
        );
      }
      break;
    }

    case 'TOPIC_UPDATE': {
      const topicId = update.payload?.topicId || update.targetId;
      const name = update.targetName || update.title;
      const category = update.category || 'Computer Science';
      const summary = update.payload?.summary || update.description || '';
      const coordX = update.payload?.coord_x ?? 0.0;
      const coordY = update.payload?.coord_y ?? 0.0;
      const coordZ = update.payload?.coord_z ?? 0.0;

      const existing = await queryFn(`SELECT id FROM topics WHERE id = $1`, [topicId]);
      if (existing.rows && existing.rows.length > 0) {
        await queryFn(
          `UPDATE topics SET name = $1, category = $2, summary = $3 WHERE id = $4`,
          [name, category, summary, topicId]
        );
      } else {
        await queryFn(
          `INSERT INTO topics (id, name, category, summary, mastery, status, coord_x, coord_y, coord_z)
           VALUES ($1, $2, $3, $4, 0.0, 'NEW', $5, $6, $7)`,
          [topicId, name, category, summary, coordX, coordY, coordZ]
        );
      }
      break;
    }

    case 'QUIZ_UPDATE': {
      const topicId = update.payload?.topicId || update.targetId;
      const title = update.title || `${update.targetName} Quiz`;
      const description = update.description || '';

      let quizId = update.payload?.quizId;
      const existingQuiz = await queryFn(`SELECT id FROM quizzes WHERE topic_id = $1`, [topicId]);
      if (existingQuiz.rows && existingQuiz.rows.length > 0) {
        quizId = existingQuiz.rows[0].id;
        await queryFn(`UPDATE quizzes SET title = $1, updated_at = NOW() WHERE id = $2`, [title, quizId]);
      } else {
        if (!quizId) quizId = generateEntityId('QUIZ');
        await queryFn(
          `INSERT INTO quizzes (id, topic_id, title, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [quizId, topicId, title, description]
        );
      }

      // Upsert quiz questions if provided
      const questions = update.payload?.questions || [];
      for (const q of questions) {
        const questionId = (q as any).id || generateEntityId('QUESTION');
        const noteId = update.payload?.noteId || null;
        const qPayload = JSON.stringify(q.payload || {});

        await queryFn(
          `INSERT INTO quiz_questions (id, quiz_id, note_id, type, prompt, payload, correct_answer, explanation, difficulty, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (id) DO UPDATE
           SET prompt = EXCLUDED.prompt,
               payload = EXCLUDED.payload,
               correct_answer = EXCLUDED.correct_answer,
               explanation = EXCLUDED.explanation,
               difficulty = EXCLUDED.difficulty`,
          [
            questionId,
            quizId,
            noteId,
            q.type || 'MCQ',
            q.prompt,
            qPayload,
            q.correctAnswer || (q as any).correct_answer || '',
            q.explanation || '',
            q.difficulty || 'MEDIUM'
          ]
        );
      }
      break;
    }

    case 'EDGE_UPDATE': {
      const topicId = update.payload?.topicId || update.targetId;
      const prerequisites = update.payload?.prerequisites || [];

      for (const prereqId of prerequisites) {
        if (prereqId && prereqId !== topicId) {
          await queryFn(
            `INSERT INTO topic_prerequisites (topic_id, prerequisite_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [topicId, prereqId]
          );
        }
      }
      break;
    }

    default:
      throw new Error(`Unsupported GraphUpdate type: ${(update as any).type}`);
  }
}

/**
 * Approves a specific GraphUpdate:
 * 1. Marks the update as APPROVED.
 * 2. Applies changes to PostgreSQL tables.
 * 3. Updates the parent queue row in ingest_review_queue.
 */
export async function approveQueueUpdate(updateId: string): Promise<{
  success: boolean;
  update: GraphUpdate;
  queueId: string;
}> {
  const match = await getUpdateById(updateId);
  if (!match) {
    throw new Error(`Update ${updateId} not found in review queue`);
  }

  const { queueItem, update } = match;

  // Apply diff to DB
  await applyGraphUpdateToDatabase(update);

  // Update in-memory state
  update.status = 'APPROVED';

  // Check if all updates in this queue item are resolved
  const allResolved = queueItem.updates.every((u) => u.status === 'APPROVED' || u.status === 'REJECTED');
  const allApproved = queueItem.updates.every((u) => u.status === 'APPROVED');
  const newQueueStatus = allApproved ? 'APPROVED' : (allResolved ? 'APPROVED' : queueItem.status);

  await query(
    `UPDATE ingest_review_queue
     SET status = $1, payload = $2, reviewed_at = NOW()
     WHERE id = $3`,
    [newQueueStatus, JSON.stringify(queueItem.payload), queueItem.id]
  );

  return {
    success: true,
    update,
    queueId: queueItem.id
  };
}

/**
 * Rejects a specific GraphUpdate:
 * 1. Marks the update as REJECTED.
 * 2. Updates the parent queue row.
 */
export async function rejectQueueUpdate(updateId: string): Promise<{
  success: boolean;
  update: GraphUpdate;
  queueId: string;
}> {
  const match = await getUpdateById(updateId);
  if (!match) {
    throw new Error(`Update ${updateId} not found in review queue`);
  }

  const { queueItem, update } = match;
  update.status = 'REJECTED';

  const allRejected = queueItem.updates.every((u) => u.status === 'REJECTED');
  const newQueueStatus = allRejected ? 'REJECTED' : queueItem.status;

  await query(
    `UPDATE ingest_review_queue
     SET status = $1, payload = $2, reviewed_at = NOW()
     WHERE id = $3`,
    [newQueueStatus, JSON.stringify(queueItem.payload), queueItem.id]
  );

  return {
    success: true,
    update,
    queueId: queueItem.id
  };
}

/**
 * Requests changes on an update (Human-in-the-loop Agent Redrafting):
 * 1. Feeds reviewer comments and general feedback into reDraftNoteWithFeedback.
 * 2. Re-synthesizes study note while strictly guarding against information loss.
 * 3. Replaces update.newContent with revised markdown.
 * 4. Staged back in the review queue with status PENDING so user can review the revised diff.
 */
export async function requestChangesOnUpdate(
  updateId: string,
  payload: RequestChangesPayload,
  options?: { llmClient?: any }
): Promise<{
  success: boolean;
  update: GraphUpdate;
  auditReport: any;
  queueId: string;
}> {
  const match = await getUpdateById(updateId);
  if (!match) {
    throw new Error(`Update ${updateId} not found in review queue`);
  }

  const { queueItem, update } = match;

  if (update.type !== 'NOTE_UPDATE') {
    throw new Error(`Requesting changes is currently supported for NOTE_UPDATE entities only`);
  }

  // Retrieve existing baseline note if available in database
  let existingContent = update.oldContent || '';
  if (!existingContent && (update.payload?.noteId || update.payload?.topicId || update.targetId)) {
    try {
      const topicId = update.payload?.topicId || update.targetId;
      const dbRes = await query(`SELECT content FROM notes WHERE topic_id = $1 LIMIT 1`, [topicId]);
      if (dbRes.rows && dbRes.rows.length > 0) {
        existingContent = dbRes.rows[0].content;
      }
    } catch {
      // Ignore fallback if DB offline
    }
  }

  // Trigger agent redrafting loop
  const reDraftRes = await reDraftNoteWithFeedback(
    existingContent,
    update.newContent,
    payload.comments,
    payload.generalFeedback,
    {
      name: update.targetName,
      category: update.category,
      summary: update.description
    },
    options
  );

  // Update GraphUpdate entity with revised content and review comments
  update.newContent = reDraftRes.revisedMarkdown;
  update.comments = payload.comments;
  update.generalFeedback = payload.generalFeedback;
  update.status = 'PENDING'; // Staged ready for re-review in review queue

  // Update review queue record
  queueItem.status = 'PENDING';
  await query(
    `UPDATE ingest_review_queue
     SET status = 'PENDING', payload = $1, reviewed_at = NULL
     WHERE id = $2`,
    [JSON.stringify(queueItem.payload), queueItem.id]
  );

  return {
    success: true,
    update,
    auditReport: reDraftRes.auditReport,
    queueId: queueItem.id
  };
}

/**
 * Approves an entire queue item, applying all contained updates.
 */
export async function approveEntireQueueItem(queueId: string): Promise<{
  success: boolean;
  queueItem: ReviewQueueItemDTO;
}> {
  const result = await query<IngestReviewQueueRow>(
    `SELECT id, source_url, status, payload, audit_report, created_at, reviewed_at
     FROM ingest_review_queue
     WHERE id = $1`,
    [queueId]
  );

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Queue item ${queueId} not found`);
  }

  const queueItem = normalizeQueueRow(result.rows[0]);

  for (const update of queueItem.updates) {
    await applyGraphUpdateToDatabase(update);
    update.status = 'APPROVED';
  }

  queueItem.status = 'APPROVED';

  await query(
    `UPDATE ingest_review_queue
     SET status = 'APPROVED', payload = $1, reviewed_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(queueItem.payload), queueId]
  );

  return {
    success: true,
    queueItem
  };
}

/**
 * Rejects an entire queue item.
 */
export async function rejectEntireQueueItem(queueId: string): Promise<{
  success: boolean;
  queueItem: ReviewQueueItemDTO;
}> {
  const result = await query<IngestReviewQueueRow>(
    `SELECT id, source_url, status, payload, audit_report, created_at, reviewed_at
     FROM ingest_review_queue
     WHERE id = $1`,
    [queueId]
  );

  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Queue item ${queueId} not found`);
  }

  const queueItem = normalizeQueueRow(result.rows[0]);

  for (const update of queueItem.updates) {
    update.status = 'REJECTED';
  }

  queueItem.status = 'REJECTED';

  await query(
    `UPDATE ingest_review_queue
     SET status = 'REJECTED', payload = $1, reviewed_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(queueItem.payload), queueId]
  );

  return {
    success: true,
    queueItem
  };
}
