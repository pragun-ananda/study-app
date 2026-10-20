import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { TRAPPING_RAIN_WATER_LEARNING_PATH } from '../../src/data/trappingRainWaterLearningPath.js';
import { FAULT_TOLERANT_WORK_QUEUE_LEARNING_PATH } from '../../src/data/faultTolerantWorkQueueLearningPath.js';
import { FAULT_TOLERANT_WORK_QUEUE_PROBLEM } from '../../src/data/faultTolerantWorkQueueProblem.js';
import { saveLearningPath } from '../../src/services/interviewLearningService.js';
import { createProblem, updateProblem } from '../../src/services/problemService.js';
import { query } from '../../src/db.js';
import { formatCanonicalSolutionMarkdown } from '../../src/utils/canonicalSolutionMarkdown.js';
import { setupTestDatabase, seedBasicTestData } from '../helpers.js';

describe('Interview learning path and practice attempt API', () => {
  beforeEach(async () => {
    const db = setupTestDatabase();
    seedBasicTestData(db);
    db.public.none(`
      INSERT INTO problems (
        id, title, type, difficulty, domain, summary, prompt, solution,
        hints, starter_code, test_cases, rubric, follow_ups, target_companies, time_limit_minutes
      ) VALUES (
        'PROB-TRAPPING-RAIN-WATER', 'Trapping Rain Water', 'CODING', 'HARD', 'CS',
        'Compute trapped water.', 'Canonical prompt stays on the problem.', 'Canonical solution stays on the problem.',
        '[]', '{}', '[]', '{}', '[]', '{}', 30
      );
    `);
    await saveLearningPath(TRAPPING_RAIN_WATER_LEARNING_PATH);
  });

  it('serves a validated pilot path separately from the canonical problem', async () => {
    const response = await request(app).get('/api/problems/PROB-TRAPPING-RAIN-WATER/learning-path');
    expect(response.status).toBe(200);
    expect(response.body.version).toBe(1);
    expect(response.body.publicationStatus).toBe('PILOT');
    expect(response.body.reasoningStages).toHaveLength(4);
    expect(response.body.transferExercise.changedConstraint).toContain('width');
  });

  it('keeps queue guide availability in sync after the editor formats the canonical solution', async () => {
    const db = setupTestDatabase();
    seedBasicTestData(db);
    await createProblem(FAULT_TOLERANT_WORK_QUEUE_PROBLEM);

    const linkedTopicIds = [...new Set(FAULT_TOLERANT_WORK_QUEUE_LEARNING_PATH.concepts
      .map((concept) => concept.topicId)
      .filter((id): id is string => Boolean(id)))];
    for (const id of linkedTopicIds) {
      await query(
        'INSERT INTO topics (id, name, category, summary) VALUES ($1, $2, $3, $4)',
        [id, id, 'SYSTEMS', 'Queue concept test node.']
      );
    }
    await saveLearningPath(FAULT_TOLERANT_WORK_QUEUE_LEARNING_PATH);

    const initialPath = await request(app).get(`/api/problems/${FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id}/learning-path`);
    expect(initialPath.status).toBe(200);
    expect(initialPath.body.problemBreakdown.contract).toHaveLength(5);

    await updateProblem(FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id!, {
      solution: formatCanonicalSolutionMarkdown(FAULT_TOLERANT_WORK_QUEUE_PROBLEM.solution)
    });

    const list = await request(app).get('/api/problems');
    const listedProblem = list.body.find((item: { id: string }) => item.id === FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id);
    expect(listedProblem.guidedLearningPathAvailable).toBe(true);
    const detail = await request(app).get(`/api/problems/${FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id}`);
    expect(detail.body.guidedLearningPathAvailable).toBe(true);
    expect((await request(app).get(`/api/problems/${FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id}/learning-path`)).status).toBe(200);

    await updateProblem(FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id!, {
      solution: `${FAULT_TOLERANT_WORK_QUEUE_PROBLEM.solution}\nA real source change.`
    });
    const staleList = await request(app).get('/api/problems');
    const staleProblem = staleList.body.find((item: { id: string }) => item.id === FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id);
    expect(staleProblem.guidedLearningPathAvailable).toBe(false);
    expect((await request(app).get(`/api/problems/${FAULT_TOLERANT_WORK_QUEUE_PROBLEM.id}/learning-path`)).status).toBe(404);
  });

  it('records version-bound events and schedules a follow-up without assigning mastery', async () => {
    const start = await request(app).post('/api/problems/PROB-TRAPPING-RAIN-WATER/learning-attempts').send({});
    expect(start.status).toBe(201);
    const attemptId = start.body.id;

    const stage = await request(app)
      .post(`/api/problems/PROB-TRAPPING-RAIN-WATER/learning-attempts/${attemptId}/events`)
      .send({ eventType: 'STAGE_RESPONSE', stageId: 'derive-depth', payload: { response: 'min(leftMax, rightMax) - height[i]' } });
    expect(stage.status).toBe(201);

    const invalidStage = await request(app)
      .post(`/api/problems/PROB-TRAPPING-RAIN-WATER/learning-attempts/${attemptId}/events`)
      .send({ eventType: 'STAGE_VERIFIED', stageId: 'not-a-stage', payload: {} });
    expect(invalidStage.status).toBe(400);

    const prematureComplete = await request(app)
      .post(`/api/problems/PROB-TRAPPING-RAIN-WATER/learning-attempts/${attemptId}/events`)
      .send({ eventType: 'COMPLETED', payload: {} });
    expect(prematureComplete.status).toBe(400);

    for (const stage of TRAPPING_RAIN_WATER_LEARNING_PATH.reasoningStages) {
      await request(app)
        .post(`/api/problems/PROB-TRAPPING-RAIN-WATER/learning-attempts/${attemptId}/events`)
        .send({ eventType: 'STAGE_VERIFIED', stageId: stage.id, payload: { selfChecked: true } });
    }
    await request(app)
      .post(`/api/problems/PROB-TRAPPING-RAIN-WATER/learning-attempts/${attemptId}/events`)
      .send({ eventType: 'TRANSFER_RESPONSE', payload: { response: 'Multiply each computed depth by width[i].' } });
    const complete = await request(app)
      .post(`/api/problems/PROB-TRAPPING-RAIN-WATER/learning-attempts/${attemptId}/events`)
      .send({ eventType: 'COMPLETED', payload: {} });
    expect(complete.status).toBe(201);

    const attempts = await request(app).get('/api/problems/PROB-TRAPPING-RAIN-WATER/learning-attempts');
    expect(attempts.status).toBe(200);
    expect(attempts.body).toHaveLength(1);
    expect(attempts.body[0].pathVersion).toBe(1);
    expect(attempts.body[0].completedAt).toBeTruthy();
    expect(attempts.body[0].reviewDueAt).toBeTruthy();
    expect(attempts.body[0]).not.toHaveProperty('mastery');
  });

  it('rejects invalid confidence and responses belonging to another problem', async () => {
    const start = await request(app).post('/api/problems/PROB-TRAPPING-RAIN-WATER/learning-attempts').send({});
    const confidence = await request(app)
      .post(`/api/problems/PROB-TRAPPING-RAIN-WATER/learning-attempts/${start.body.id}/events`)
      .send({ eventType: 'CONFIDENCE_RECORDED', payload: { confidence: 9 } });
    expect(confidence.status).toBe(400);

    const wrongProblem = await request(app)
      .post(`/api/problems/PROB-TEST-OTHER/learning-attempts/${start.body.id}/events`)
      .send({ eventType: 'HINT_REQUESTED', stageId: 'derive-depth', payload: {} });
    expect(wrongProblem.status).toBe(404);
  });
});
