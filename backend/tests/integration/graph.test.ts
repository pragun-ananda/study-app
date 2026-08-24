import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { setupTestDatabase, seedBasicTestData } from '../helpers.js';

describe('Integration: Prerequisites Graph REST API (/api/topics/:id/prerequisites)', () => {
  let db: any;

  beforeEach(() => {
    db = setupTestDatabase();
    seedBasicTestData(db);
  });

  describe('POST /api/topics/:id/prerequisites', () => {
    it('creates a directed prerequisite edge between two valid topics', async () => {
      // Add TOPIC-003 as prerequisite to TOPIC-002
      const res = await request(app)
        .post('/api/topics/TOPIC-002/prerequisites')
        .send({ prerequisiteId: 'TOPIC-003' });

      expect(res.status).toBe(201);
      expect(res.body.topicId).toBe('TOPIC-002');
      expect(res.body.prerequisiteId).toBe('TOPIC-003');

      // Verify TOPIC-002 now has TOPIC-003 in prerequisites
      const topic2 = await request(app).get('/api/topics/TOPIC-002');
      expect(topic2.body.prerequisites).toContain('TOPIC-003');

      // Verify TOPIC-003 now has TOPIC-002 in unlocks
      const topic3 = await request(app).get('/api/topics/TOPIC-003');
      expect(topic3.body.unlocks).toContain('TOPIC-002');
    });

    it('rejects self-referential prerequisite edges (self-loop prevention)', async () => {
      const res = await request(app)
        .post('/api/topics/TOPIC-001/prerequisites')
        .send({ prerequisiteId: 'TOPIC-001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Self-loop detected');
    });

    it('rejects prerequisite edge when referenced topic does not exist', async () => {
      const res = await request(app)
        .post('/api/topics/TOPIC-001/prerequisites')
        .send({ prerequisiteId: 'TOPIC-999' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('referenced topics do not exist');
    });

    it('tolerates legitimate bidirectional/mutual cycles (e.g. GAN <-> VAE)', async () => {
      // Currently TOPIC-001 is prereq to TOPIC-002.
      // Add reverse relationship: TOPIC-002 is prereq to TOPIC-001
      const res = await request(app)
        .post('/api/topics/TOPIC-001/prerequisites')
        .send({ prerequisiteId: 'TOPIC-002' });

      expect(res.status).toBe(201);

      // Verify both mutual edges co-exist
      const topic1 = await request(app).get('/api/topics/TOPIC-001');
      expect(topic1.body.prerequisites).toContain('TOPIC-002');
      expect(topic1.body.unlocks).toContain('TOPIC-002');

      const topic2 = await request(app).get('/api/topics/TOPIC-002');
      expect(topic2.body.prerequisites).toContain('TOPIC-001');
      expect(topic2.body.unlocks).toContain('TOPIC-001');
    });
  });

  describe('DELETE /api/topics/:id/prerequisites/:prereqId', () => {
    it('removes a directed prerequisite relationship', async () => {
      // TOPIC-002 currently requires TOPIC-001
      const res = await request(app).delete('/api/topics/TOPIC-002/prerequisites/TOPIC-001');
      expect(res.status).toBe(204);

      // Verify relationship is removed
      const topic2 = await request(app).get('/api/topics/TOPIC-002');
      expect(topic2.body.prerequisites).not.toContain('TOPIC-001');
    });

    it('returns 404 when deleting non-existent relationship', async () => {
      const res = await request(app).delete('/api/topics/TOPIC-001/prerequisites/TOPIC-003');
      expect(res.status).toBe(404);
    });
  });
});
