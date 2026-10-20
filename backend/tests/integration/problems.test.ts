import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { setupTestDatabase, seedBasicTestData } from '../helpers.js';

describe('Integration: Problem Bank REST API (/api/problems - BAC-38)', () => {
  let db: any;

  beforeEach(() => {
    db = setupTestDatabase();
    seedBasicTestData(db);

    db.public.none(`
      INSERT INTO problems (
        id, title, type, difficulty, domain, summary, prompt, solution,
        hints, starter_code, test_cases, rubric, follow_ups, target_companies, time_limit_minutes
      ) VALUES (
        'PROB-TEST-1',
        'Design a High-Throughput Distributed Rate Limiter',
        'SYSTEM_DESIGN',
        'HARD',
        'SYSTEMS',
        'Multi-region token bucket and sliding window rate limiter.',
        '### Requirements\nDesign a rate limiter for 500k RPS.',
        '### Solution\nUse Redis sliding window log with Lua scripts.',
        '["Use Redis Cluster", "Fail open under partitions"]'::jsonb,
        '{"python": "class RateLimiter:\\n    pass"}'::jsonb,
        '[{"input": "client_1", "expected": true}]'::jsonb,
        '{"architecture": 50, "concurrency": 50}'::jsonb,
        '[{"id": "FU-TEST-1", "title": "Scaling Flood Telemetry", "prompt": "How to scale to 10M events/sec?", "rubric": {"partitioning": 50, "reliability": 50}, "hints": ["Use Kafka partitioning"]}]'::jsonb,
        ARRAY['Stripe', 'Netflix'],
        45
      );

      INSERT INTO problem_prerequisites (problem_id, topic_id)
      VALUES ('PROB-TEST-1', 'TOPIC-001');
    `);
  });

  describe('GET /api/problems', () => {
    it('returns list of interview problems with attached prerequisite topic IDs', async () => {
      const res = await request(app).get('/api/problems');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const prob = res.body.find((p: any) => p.id === 'PROB-TEST-1');
      expect(prob).toBeDefined();
      expect(prob.title).toBe('Design a High-Throughput Distributed Rate Limiter');
      expect(prob.type).toBe('SYSTEM_DESIGN');
      expect(prob.difficulty).toBe('HARD');
      expect(prob.domain).toBe('SYSTEMS');
      expect(prob.targetCompanies).toEqual(['Stripe', 'Netflix']);
      expect(prob.prerequisiteTopicIds).toContain('TOPIC-001');
    });

    it('filters problems by type, difficulty, and company', async () => {
      const resType = await request(app).get('/api/problems?type=SYSTEM_DESIGN');
      expect(resType.status).toBe(200);
      expect(resType.body.length).toBe(1);

      const resDiff = await request(app).get('/api/problems?difficulty=HARD');
      expect(resDiff.status).toBe(200);
      expect(resDiff.body.length).toBe(1);

      const resComp = await request(app).get('/api/problems?company=Stripe');
      expect(resComp.status).toBe(200);
      expect(resComp.body.length).toBe(1);

      const resNone = await request(app).get('/api/problems?type=CODING');
      expect(resNone.status).toBe(200);
      expect(resNone.body.length).toBe(0);
    });

    it('filters problems by topicId prerequisite', async () => {
      const res = await request(app).get('/api/problems?topicId=TOPIC-001');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);

      const resEmpty = await request(app).get('/api/problems?topicId=TOPIC-003');
      expect(resEmpty.status).toBe(200);
      expect(resEmpty.body.length).toBe(0);
    });
  });

  describe('GET /api/problems/:id', () => {
    it('returns full problem details with hydrated prerequisite topics and mastery stats', async () => {
      const res = await request(app).get('/api/problems/PROB-TEST-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('PROB-TEST-1');
      expect(res.body.prompt).toContain('500k RPS');
      expect(res.body.solution).toContain('Redis sliding window');
      expect(res.body.hints).toContain('Use Redis Cluster');
      expect(res.body.timeLimitMinutes).toBe(45);

      // Hydrated prerequisite topics from graph
      expect(Array.isArray(res.body.prerequisiteTopics)).toBe(true);
      expect(res.body.prerequisiteTopics.length).toBe(1);
      const topic = res.body.prerequisiteTopics[0];
      expect(topic.id).toBe('TOPIC-001');
      expect(topic.name).toBe('Neural Network Backpropagation');
      expect(topic.mastery).toBe(80);
      expect(topic.status).toBe('MASTERED');
    });

    it('returns 404 for non-existent problem ID', async () => {
      const res = await request(app).get('/api/problems/PROB-NONEXISTENT');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('POST /api/problems', () => {
    it('creates a new coding problem with prerequisites and test cases', async () => {
      const payload = {
        title: 'Trapping Rain Water',
        type: 'CODING',
        difficulty: 'HARD',
        domain: 'CS',
        summary: 'Compute trapped rainwater volume using two pointers.',
        prompt: 'Given n non-negative integers representing an elevation map...',
        solution: 'Use two pointers converging from left and right.',
        hints: ['Consider min(left_max, right_max)'],
        starterCode: { python: 'def trap(height): pass' },
        testCases: [{ input: [0, 1, 0, 2], expected: 1 }],
        targetCompanies: ['Google', 'Meta'],
        timeLimitMinutes: 30,
        prerequisiteTopicIds: ['TOPIC-003']
      };

      const res = await request(app).post('/api/problems').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^PROB-/);
      expect(res.body.title).toBe('Trapping Rain Water');
      expect(res.body.type).toBe('CODING');
      expect(res.body.prerequisiteTopicIds).toContain('TOPIC-003');
      expect(res.body.targetCompanies).toEqual(['Google', 'Meta']);
    });

    it('rejects creation when required fields are missing', async () => {
      const res = await request(app).post('/api/problems').send({ title: 'Incomplete' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
    });
  });

  describe('PUT /api/problems/:id', () => {
    it('updates problem details and prerequisite associations', async () => {
      const res = await request(app)
        .put('/api/problems/PROB-TEST-1')
        .send({
          title: 'Design a High-Throughput Distributed Rate Limiter (Updated)',
          difficulty: 'MEDIUM',
          prerequisiteTopicIds: ['TOPIC-002']
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toContain('(Updated)');
      expect(res.body.difficulty).toBe('MEDIUM');
      expect(res.body.prerequisiteTopicIds).toEqual(['TOPIC-002']);
    });

    it('returns 404 when updating non-existent problem', async () => {
      const res = await request(app).put('/api/problems/PROB-GHOST').send({ title: 'New' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/problems/:id', () => {
    it('deletes problem and cascades to prerequisites', async () => {
      const res = await request(app).delete('/api/problems/PROB-TEST-1');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      const check = await request(app).get('/api/problems/PROB-TEST-1');
      expect(check.status).toBe(404);
    });

    it('returns 404 when deleting non-existent problem', async () => {
      const res = await request(app).delete('/api/problems/PROB-GHOST');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/problems/seed', () => {
    it('seeds curated interview problems successfully', async () => {
      const res = await request(app).post('/api/problems/seed');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.seededCount).toBeGreaterThan(0);
    });
  });

  describe('POST /api/problems/:id/submit & GET /api/problems/:id/submissions', () => {
    it('rejects submission with 400 if language or code is missing', async () => {
      const res = await request(app)
        .post('/api/problems/PROB-TEST-1/submit')
        .send({ language: 'typescript' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Language and code are required');
    });

    it('returns 404 when submitting solution for non-existent problem', async () => {
      const res = await request(app)
        .post('/api/problems/PROB-GHOST/submit')
        .send({ language: 'typescript', code: 'export function solve() {}' });
      expect(res.status).toBe(404);
    });

    it('successfully records solution submission with test execution telemetry', async () => {
      const res = await request(app)
        .post('/api/problems/PROB-TEST-1/submit')
        .send({
          language: 'typescript',
          code: 'export function solve() { return true; }',
          status: 'ACCEPTED',
          passedCount: 5,
          totalCount: 5,
          runtimeMs: 1.25,
          memoryKb: 38400,
          stdout: 'Executing test suite...\nAll 5 cases passed.'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^SUB-/);
      expect(res.body.problemId).toBe('PROB-TEST-1');
      expect(res.body.language).toBe('typescript');
      expect(res.body.status).toBe('ACCEPTED');
      expect(res.body.passedCount).toBe(5);
      expect(res.body.totalCount).toBe(5);
      expect(res.body.runtimeMs).toBe(1.25);
      expect(res.body.memoryKb).toBe(38400);
      expect(res.body.stdout).toContain('All 5 cases passed.');

      // Retrieve submission history
      const histRes = await request(app).get('/api/problems/PROB-TEST-1/submissions');
      expect(histRes.status).toBe(200);
      expect(Array.isArray(histRes.body)).toBe(true);
      expect(histRes.body.length).toBe(1);
      expect(histRes.body[0].id).toBe(res.body.id);
      expect(histRes.body[0].status).toBe('ACCEPTED');
    });

    it('records failing submission with failed test case details', async () => {
      const res = await request(app)
        .post('/api/problems/PROB-TEST-1/submit')
        .send({
          language: 'python',
          code: 'class Solution:\n    def trap(self): return 0',
          status: 'WRONG_ANSWER',
          passedCount: 0,
          totalCount: 2,
          runtimeMs: 2.1,
          failedTestCase: {
            input: [0, 1, 0, 2],
            expected: 1,
            actual: 0
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('WRONG_ANSWER');
      expect(res.body.passedCount).toBe(0);
      expect(res.body.totalCount).toBe(2);
      expect(res.body.failedTestCase).toBeDefined();
      expect(res.body.failedTestCase.expected).toBe(1);
      expect(res.body.failedTestCase.actual).toBe(0);
    });
  });

  describe('GET /api/problems/:id/follow-ups & Responses', () => {
    it('retrieves system design follow-ups for a problem', async () => {
      await request(app)
        .put('/api/problems/PROB-TEST-1')
        .send({
          followUps: [
            {
              id: 'FU-TEST-1',
              title: 'Scaling Flood Telemetry',
              prompt: 'How to scale to 10M events/sec?',
              rubric: { partitioning: 50, reliability: 50 },
              hints: ['Use Kafka partitioning']
            }
          ]
        });

      const res = await request(app).get('/api/problems/PROB-TEST-1/follow-ups');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe('FU-TEST-1');
      expect(res.body[0].title).toBe('Scaling Flood Telemetry');
      expect(res.body[0].hints).toContain('Use Kafka partitioning');
    });

    it('returns 404 for follow-ups on non-existent problem', async () => {
      const res = await request(app).get('/api/problems/PROB-GHOST/follow-ups');
      expect(res.status).toBe(404);
    });

    it('saves candidate architecture follow-up response (upsert) and retrieves response history', async () => {
      const saveRes = await request(app)
        .post('/api/problems/PROB-TEST-1/follow-ups/FU-TEST-1/response')
        .send({
          responseText: 'We use Kafka partitioned by watershed ID with Flink for sliding window aggregation.',
          diagramData: { nodes: [{ id: 'kafka', label: 'Kafka' }] },
          score: 95,
          feedback: 'Strong stateful stream design'
        });

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.problemId).toBe('PROB-TEST-1');
      expect(saveRes.body.followUpId).toBe('FU-TEST-1');
      expect(saveRes.body.responseText).toContain('Kafka partitioned');
      expect(saveRes.body.diagramData).toBeDefined();
      expect(saveRes.body.score).toBe(95);

      // Verify upsert updates the response text
      const updateRes = await request(app)
        .post('/api/problems/PROB-TEST-1/follow-ups/FU-TEST-1/response')
        .send({
          responseText: 'Updated response with RocksDB state stores.'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.responseText).toContain('RocksDB state stores');

      // Retrieve responses
      const getRes = await request(app).get('/api/problems/PROB-TEST-1/follow-ups/responses');
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.length).toBe(1);
      expect(getRes.body[0].responseText).toContain('RocksDB state stores');
    });

    it('rejects response save with 400 if responseText is missing', async () => {
      const res = await request(app)
        .post('/api/problems/PROB-TEST-1/follow-ups/FU-TEST-1/response')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('responseText is required');
    });

    it('returns 404 when grading for non-existent problem or follow-up', async () => {
      const res1 = await request(app)
        .post('/api/problems/PROB-GHOST/follow-ups/FU-TEST-1/grade')
        .send({ responseText: 'Some architecture' });
      expect(res1.status).toBe(404);

      const res2 = await request(app)
        .post('/api/problems/PROB-TEST-1/follow-ups/FU-GHOST/grade')
        .send({ responseText: 'Some architecture' });
      expect(res2.status).toBe(404);
    });

    it('grades follow-up architecture response, returns evaluation report, and saves score to DB', async () => {
      const gradeRes = await request(app)
        .post('/api/problems/PROB-TEST-1/follow-ups/FU-TEST-1/grade')
        .send({
          responseText:
            'Kafka stream partitioned by WatershedID. Flink stateful tumbling windows with RocksDB checkpoint replicas for HA.',
          diagramData: {
            elements: [
              { id: '1', type: 'rectangle', text: 'Kafka Broker', isDeleted: false },
              { id: '2', type: 'arrow', isDeleted: false },
              { id: '3', type: 'rectangle', text: 'Flink Worker Cluster', isDeleted: false }
            ]
          }
        });

      expect(gradeRes.status).toBe(200);
      expect(gradeRes.body.evaluation).toBeDefined();
      expect(gradeRes.body.evaluation.score).toBeGreaterThanOrEqual(0);
      expect(gradeRes.body.evaluation.score).toBeLessThanOrEqual(100);
      expect(gradeRes.body.evaluation.rubricScores).toBeDefined();
      expect(gradeRes.body.evaluation.scalabilityAssessment).toBeDefined();
      expect(Array.isArray(gradeRes.body.evaluation.singlePointsOfFailure)).toBe(true);
      expect(Array.isArray(gradeRes.body.evaluation.actionableImprovements)).toBe(true);

      // Verify saved response was persisted in database
      expect(gradeRes.body.savedResponse).toBeDefined();
      expect(gradeRes.body.savedResponse.score).toBe(gradeRes.body.evaluation.score);
      expect(gradeRes.body.savedResponse.feedback).toContain('scalabilityAssessment');

      // Verify retrieving responses returns the newly graded response
      const getRes = await request(app).get('/api/problems/PROB-TEST-1/follow-ups/responses');
      expect(getRes.status).toBe(200);
      const matched = getRes.body.find((r: any) => r.followUpId === 'FU-TEST-1');
      expect(matched).toBeDefined();
      expect(matched.score).toBe(gradeRes.body.evaluation.score);
    });

    it('grades ad-hoc system design via direct endpoint POST /api/problems/grade-system-design', async () => {
      const res = await request(app)
        .post('/api/problems/grade-system-design')
        .send({
          prompt: 'Design a distributed rate limiter supporting 1M RPS.',
          rubric: {
            token_bucket: 50,
            redis_sliding_window: 50
          },
          responseText: 'Redis cluster with sliding window counter using Redis hashes and Lua scripts.',
          diagramData: {
            elements: [
              { id: '1', type: 'rectangle', text: 'API Gateway', isDeleted: false },
              { id: '2', type: 'rectangle', text: 'Redis Cluster', isDeleted: false }
            ]
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.evaluation).toBeDefined();
      expect(res.body.evaluation.score).toBeGreaterThanOrEqual(0);
      expect(res.body.evaluation.rubricScores.token_bucket).toBeDefined();
      expect(res.body.evaluation.rubricScores.redis_sliding_window).toBeDefined();
    });
  });
});

