import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { setupTestDatabase, seedBasicTestData } from '../helpers.js';
import { query } from '../../src/db.js';

describe('Integration: Repositories & Annotations REST API (/api/repositories)', () => {
  beforeEach(async () => {
    const db = setupTestDatabase();
    seedBasicTestData(db);
  });

  describe('POST /api/repositories/import & GET /api/repositories', () => {
    it('imports a repository from GitHub URL and lists it', async () => {
      const importRes = await request(app)
        .post('/api/repositories/import')
        .send({ url: 'https://github.com/redis/redis' });

      expect(importRes.status).toBe(201);
      expect(importRes.body.fullName).toBe('redis/redis');
      expect(importRes.body.id).toMatch(/^REPO-/);

      const listRes = await request(app).get('/api/repositories');
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.length).toBeGreaterThanOrEqual(1);

      const found = listRes.body.find((r: any) => r.fullName === 'redis/redis');
      expect(found).toBeDefined();
    });

    it('returns 400 when importing without a url, fullName, or name', async () => {
      const res = await request(app)
        .post('/api/repositories/import')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('retrieves single repository details via GET /api/repositories/:id', async () => {
      const importRes = await request(app)
        .post('/api/repositories/import')
        .send({ url: 'https://github.com/tokio-rs/tokio' });

      const repoId = importRes.body.id;

      const getRes = await request(app).get(`/api/repositories/${repoId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.fullName).toBe('tokio-rs/tokio');

      const notFoundRes = await request(app).get('/api/repositories/REPO-NONEXISTENT');
      expect(notFoundRes.status).toBe(404);
    });
  });

  describe('GET /api/repositories/:id/tree & GET /api/repositories/:id/blob', () => {
    it('returns hierarchical tree manifest and lazy-loads file blob', async () => {
      const importRes = await request(app)
        .post('/api/repositories/import')
        .send({
          originType: 'CUSTOM',
          name: 'data-structures',
          owner: 'engineer',
          customFiles: [
            { path: 'README.md', content: '# Data Structures' },
            { path: 'src/trees/avl.ts', content: 'export class AVLTree {}' }
          ]
        });

      const repoId = importRes.body.id;

      // 1. Tree Manifest
      const treeRes = await request(app).get(`/api/repositories/${repoId}/tree`);
      expect(treeRes.status).toBe(200);
      expect(treeRes.body.repositoryId).toBe(repoId);
      expect(Array.isArray(treeRes.body.tree)).toBe(true);

      // 2. Blob Content
      const blobRes = await request(app)
        .get(`/api/repositories/${repoId}/blob`)
        .query({ path: 'src/trees/avl.ts' });

      expect(blobRes.status).toBe(200);
      expect(blobRes.body.content).toContain('class AVLTree');
      expect(blobRes.body.fromCache).toBe(true);
    });

    it('returns 400 when blob query parameter path is missing', async () => {
      const importRes = await request(app)
        .post('/api/repositories/import')
        .send({ name: 'demo-repo' });

      const res = await request(app).get(`/api/repositories/${importRes.body.id}/blob`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('path');
    });
  });

  describe('Code Annotations & AI Threads Endpoints', () => {
    let repoId: string;

    beforeEach(async () => {
      const importRes = await request(app)
        .post('/api/repositories/import')
        .send({
          originType: 'CUSTOM',
          name: 'lru-cache-impl',
          owner: 'student',
          customFiles: [
            { path: 'src/lru.go', content: 'package main\n\ntype Cache struct {}\n' }
          ]
        });
      repoId = importRes.body.id;
    });

    it('creates, retrieves, updates, and deletes line annotations', async () => {
      // 1. Create Annotation
      const createRes = await request(app)
        .post(`/api/repositories/${repoId}/annotations`)
        .send({
          filePath: 'src/lru.go',
          startLine: 3,
          endLine: 3,
          title: 'Doubly Linked List Structure',
          content: 'O(1) eviction using hash map + doubly linked list node pointers.',
          anchorCodeSnippet: 'type Cache struct {}',
          designCategory: 'CONCURRENCY',
          topicId: 'TOPIC-001'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.id).toMatch(/^ANN-/);
      expect(createRes.body.title).toBe('Doubly Linked List Structure');
      expect(createRes.body.designCategory).toBe('CONCURRENCY');

      const annId = createRes.body.id;

      // 2. List Annotations by repo
      const listRes = await request(app).get(`/api/repositories/${repoId}/annotations`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);

      // 3. List Annotations by file
      const fileListRes = await request(app)
        .get(`/api/repositories/${repoId}/annotations`)
        .query({ path: 'src/lru.go' });
      expect(fileListRes.status).toBe(200);
      expect(fileListRes.body.length).toBe(1);

      // 4. Update Annotation
      const updateRes = await request(app)
        .put(`/api/repositories/${repoId}/annotations/${annId}`)
        .send({
          title: 'Updated Title: High-throughput LRU',
          designCategory: 'PERFORMANCE'
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.title).toContain('Updated Title');
      expect(updateRes.body.designCategory).toBe('PERFORMANCE');

      // 5. Delete Annotation
      const delRes = await request(app).delete(`/api/repositories/${repoId}/annotations/${annId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const afterDel = await request(app).get(`/api/repositories/${repoId}/annotations`);
      expect(afterDel.body.length).toBe(0);
    });

    it('manages interactive AI discussion threads on code annotations', async () => {
      const createRes = await request(app)
        .post(`/api/repositories/${repoId}/annotations`)
        .send({
          filePath: 'src/lru.go',
          startLine: 1,
          endLine: 3,
          title: 'Threaded Cache Review',
          content: 'Thread safety question'
        });

      const annId = createRes.body.id;

      // 1. Post message to thread
      const postMsgRes = await request(app)
        .post(`/api/repositories/${repoId}/annotations/${annId}/threads`)
        .send({
          sender: 'USER',
          message: 'How should mutex locks be applied across buckets?'
        });

      expect(postMsgRes.status).toBe(201);
      expect(postMsgRes.body.id).toMatch(/^TH-/);
      expect(postMsgRes.body.message).toContain('How should mutex locks');

      // 2. Post AI response to thread
      const postAiRes = await request(app)
        .post(`/api/repositories/${repoId}/annotations/${annId}/threads`)
        .send({
          sender: 'SOL_AI',
          message: 'Using striped locks across 16 or 32 shards reduces contention drastically.'
        });
      expect(postAiRes.status).toBe(201);
      expect(postAiRes.body.sender).toBe('SOL_AI');

      // 3. List threads
      const getThreadsRes = await request(app).get(`/api/repositories/${repoId}/annotations/${annId}/threads`);
      expect(getThreadsRes.status).toBe(200);
      expect(getThreadsRes.body.length).toBe(2);
      expect(getThreadsRes.body[0].sender).toBe('USER');
      expect(getThreadsRes.body[1].sender).toBe('SOL_AI');
    });
  });
});
