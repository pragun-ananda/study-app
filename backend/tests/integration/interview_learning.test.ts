import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { TRAPPING_RAIN_WATER_LEARNING_PATH } from '../../src/data/trappingRainWaterLearningPath.js';
import { saveLearningPath } from '../../src/services/interviewLearningService.js';
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
