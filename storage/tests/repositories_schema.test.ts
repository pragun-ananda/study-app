import { describe, it, expect, beforeEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import * as fs from 'fs';
import * as path from 'path';

describe('Storage Schema: Code Repositories & Annotations Engine', () => {
  let db: IMemoryDb;

  beforeEach(() => {
    db = newDb();
    const schemaPath = path.resolve(__dirname, '../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.public.none(schemaSql);
  });

  describe('Table Existence & Structure', () => {
    it('verifies repositories, cached blobs, code annotations, and annotation threads exist', () => {
      const tables = db.public.many(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      const tableNames = tables.map((t: any) => t.table_name);

      expect(tableNames).toContain('repositories');
      expect(tableNames).toContain('repository_cached_blobs');
      expect(tableNames).toContain('code_annotations');
      expect(tableNames).toContain('code_annotation_threads');
    });
  });

  describe('Repositories Table Constraints', () => {
    it('successfully inserts a valid repository record', () => {
      db.public.none(`
        INSERT INTO repositories (
          id, name, owner, full_name, origin_type, clone_url, default_branch, active_commit_sha, description, language, stars_count
        ) VALUES (
          'REPO-001', 'redis', 'redis', 'redis/redis', 'GITHUB', 'https://github.com/redis/redis.git', 'unstable', 'c1a2b3c4d5e6f7', 'In-memory database structure store', 'C', 64000
        );
      `);

      const repo = db.public.one("SELECT * FROM repositories WHERE id = 'REPO-001'");
      expect(repo.name).toBe('redis');
      expect(repo.owner).toBe('redis');
      expect(repo.full_name).toBe('redis/redis');
      expect(repo.origin_type).toBe('GITHUB');
      expect(repo.stars_count).toBe(64000);
      expect(repo.default_branch).toBe('unstable');
    });

    it('enforces full_name uniqueness across repositories', () => {
      db.public.none(`
        INSERT INTO repositories (id, name, owner, full_name, origin_type, clone_url, active_commit_sha)
        VALUES ('REPO-001', 'redis', 'redis', 'redis/redis', 'GITHUB', 'https://github.com/redis/redis.git', 'sha1');
      `);

      expect(() => {
        db.public.none(`
          INSERT INTO repositories (id, name, owner, full_name, origin_type, clone_url, active_commit_sha)
          VALUES ('REPO-002', 'redis-fork', 'other', 'redis/redis', 'GITHUB', 'https://github.com/other/redis.git', 'sha2');
        `);
      }).toThrow();
    });

    it('rejects invalid origin_type values via CHECK constraint', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO repositories (id, name, owner, full_name, origin_type, clone_url, active_commit_sha)
          VALUES ('REPO-BAD', 'bad', 'bad', 'bad/bad', 'BITBUCKET_INVALID', 'url', 'sha1');
        `);
      }).toThrow();
    });
  });

  describe('Repository Cached Blobs Constraints & Eviction Lookup', () => {
    beforeEach(() => {
      db.public.none(`
        INSERT INTO repositories (id, name, owner, full_name, origin_type, clone_url, active_commit_sha)
        VALUES ('REPO-001', 'redis', 'redis', 'redis/redis', 'GITHUB', 'https://github.com/redis/redis.git', 'sha1');
      `);
    });

    it('inserts cached file blobs with gzip compression flags and sizes', () => {
      db.public.none(`
        INSERT INTO repository_cached_blobs (
          id, repository_id, commit_sha, file_path, file_size_bytes, content, encoding, is_compressed, etag
        ) VALUES (
          'BLOB-001', 'REPO-001', 'sha1', 'src/server.c', 409600, 'H4sIC...compressed', 'gzip-base64', true, '"etag-12345"'
        );
      `);

      const blob = db.public.one("SELECT * FROM repository_cached_blobs WHERE id = 'BLOB-001'");
      expect(blob.file_path).toBe('src/server.c');
      expect(blob.file_size_bytes).toBe(409600);
      expect(blob.is_compressed).toBe(true);
      expect(blob.encoding).toBe('gzip-base64');
    });

    it('enforces compound uniqueness on (repository_id, commit_sha, file_path)', () => {
      db.public.none(`
        INSERT INTO repository_cached_blobs (id, repository_id, commit_sha, file_path, file_size_bytes, content)
        VALUES ('BLOB-001', 'REPO-001', 'sha1', 'src/server.c', 100, 'int main() {}');
      `);

      expect(() => {
        db.public.none(`
          INSERT INTO repository_cached_blobs (id, repository_id, commit_sha, file_path, file_size_bytes, content)
          VALUES ('BLOB-002', 'REPO-001', 'sha1', 'src/server.c', 200, 'int main() { return 0; }');
        `);
      }).toThrow();
    });

    it('cascades delete when the parent repository is deleted', () => {
      db.public.none(`
        INSERT INTO repository_cached_blobs (id, repository_id, commit_sha, file_path, file_size_bytes, content)
        VALUES ('BLOB-001', 'REPO-001', 'sha1', 'src/server.c', 100, 'int main() {}');
      `);

      db.public.none("DELETE FROM repositories WHERE id = 'REPO-001'");
      const count = db.public.one("SELECT COUNT(*) AS total FROM repository_cached_blobs");
      expect(Number(count.total)).toBe(0);
    });
  });

  describe('Code Annotations & AI Threads', () => {
    beforeEach(() => {
      db.public.none(`
        INSERT INTO topics (id, name, category, summary, mastery)
        VALUES ('TOPIC-001', 'Distributed In-Memory Caching', 'CS', 'Cache topology & invalidation', 50.0);

        INSERT INTO repositories (id, name, owner, full_name, origin_type, clone_url, active_commit_sha)
        VALUES ('REPO-001', 'redis', 'redis', 'redis/redis', 'GITHUB', 'https://github.com/redis/redis.git', 'sha1');
      `);
    });

    it('inserts line-anchored annotations linked to topic nodes', () => {
      db.public.none(`
        INSERT INTO code_annotations (
          id, repository_id, commit_sha, file_path, start_line, end_line, title, content, anchor_code_snippet, design_category, topic_id
        ) VALUES (
          'ANN-001', 'REPO-001', 'sha1', 'src/ae.c', 45, 60, 'Custom Multiplexing Event Loop', 'Why Redis avoids libuv in favor of clean single-threaded event loop', 'int aeProcessEvents(...) { ... }', 'CONCURRENCY', 'TOPIC-001'
        );
      `);

      const ann = db.public.one("SELECT * FROM code_annotations WHERE id = 'ANN-001'");
      expect(ann.start_line).toBe(45);
      expect(ann.end_line).toBe(60);
      expect(ann.design_category).toBe('CONCURRENCY');
      expect(ann.topic_id).toBe('TOPIC-001');
    });

    it('preserves code annotations (sets topic_id to NULL) when topic node is deleted', () => {
      db.public.none(`
        INSERT INTO code_annotations (
          id, repository_id, commit_sha, file_path, start_line, end_line, title, content, anchor_code_snippet, topic_id
        ) VALUES (
          'ANN-001', 'REPO-001', 'sha1', 'src/ae.c', 1, 10, 'Title', 'Content', 'Snippet', 'TOPIC-001'
        );
      `);

      db.public.none("DELETE FROM topics WHERE id = 'TOPIC-001'");
      const ann = db.public.one("SELECT * FROM code_annotations WHERE id = 'ANN-001'");
      expect(ann).toBeDefined();
      expect(ann.topic_id).toBeNull();
    });

    it('cascades delete from annotation to its interactive AI conversation threads', () => {
      db.public.none(`
        INSERT INTO code_annotations (
          id, repository_id, commit_sha, file_path, start_line, end_line, title, content, anchor_code_snippet
        ) VALUES (
          'ANN-001', 'REPO-001', 'sha1', 'src/ae.c', 1, 10, 'Title', 'Content', 'Snippet'
        );

        INSERT INTO code_annotation_threads (id, annotation_id, sender, message) VALUES
          ('TH-001', 'ANN-001', 'USER', 'Why does this avoid multithreaded mutexes?'),
          ('TH-002', 'ANN-001', 'SOL_AI', 'Redis achieves high throughput by keeping commands CPU-bound in memory without lock contention.');
      `);

      const threadCountBefore = db.public.one("SELECT COUNT(*) AS total FROM code_annotation_threads");
      expect(Number(threadCountBefore.total)).toBe(2);

      db.public.none("DELETE FROM code_annotations WHERE id = 'ANN-001'");
      const threadCountAfter = db.public.one("SELECT COUNT(*) AS total FROM code_annotation_threads");
      expect(Number(threadCountAfter.total)).toBe(0);
    });

    it('rejects invalid design_category values via CHECK constraint', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO code_annotations (
            id, repository_id, commit_sha, file_path, start_line, end_line, title, content, anchor_code_snippet, design_category
          ) VALUES (
            'ANN-BAD', 'REPO-001', 'sha1', 'src/ae.c', 1, 10, 'Title', 'Content', 'Snippet', 'INVALID_CATEGORY'
          );
        `);
      }).toThrow();
    });
  });
});
