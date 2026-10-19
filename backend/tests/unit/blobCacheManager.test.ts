import { describe, it, expect, beforeEach } from 'vitest';
import { blobCacheManager, DEFAULT_MAX_MEMORY_BYTES, DEFAULT_MAX_STORAGE_BYTES } from '../../src/services/blobCacheManager.js';
import { setupTestDatabase } from '../helpers.js';
import { query } from '../../src/db.js';

describe('Unit: BlobCacheManager (backend/src/services/blobCacheManager.ts)', () => {
  beforeEach(async () => {
    setupTestDatabase();
    blobCacheManager.clearMemoryCache();
    blobCacheManager.setBudgets(DEFAULT_MAX_MEMORY_BYTES, DEFAULT_MAX_STORAGE_BYTES);

    // Seed dummy repository
    await query(`
      INSERT INTO repositories (id, name, owner, full_name, origin_type, clone_url, default_branch, active_commit_sha)
      VALUES ('REPO-TEST', 'test-repo', 'tester', 'tester/test-repo', 'CUSTOM', 'local://test', 'main', 'sha-001')
    `);
  });

  describe('Compression & Decompression', () => {
    it('compresses larger source code strings using zlib deflate', () => {
      const code = 'function calculateSum(a, b) {\n  return a + b;\n}\n'.repeat(50);
      const { compressed, isCompressed, encoding } = blobCacheManager.compressContent(code);

      expect(isCompressed).toBe(true);
      expect(encoding).toBe('gzip-base64');
      expect(compressed.length).toBeLessThan(code.length);

      const decompressed = blobCacheManager.decompressContent(compressed, isCompressed, encoding);
      expect(decompressed).toBe(code);
    });

    it('stores very small snippets raw to prevent compression overhead', () => {
      const tiny = 'x = 10;';
      const { compressed, isCompressed, encoding } = blobCacheManager.compressContent(tiny);

      expect(isCompressed).toBe(false);
      expect(encoding).toBe('utf-8');
      expect(compressed).toBe(tiny);

      const restored = blobCacheManager.decompressContent(compressed, isCompressed, encoding);
      expect(restored).toBe(tiny);
    });
  });

  describe('In-Memory Hot Cache & PostgreSQL Caching', () => {
    it('saves a blob to PostgreSQL and retrieves it from in-memory cache on subsequent call', async () => {
      const saved = await blobCacheManager.saveBlob(
        'REPO-TEST',
        'sha-001',
        'src/core.ts',
        'export const ready = true;',
        '"etag-999"'
      );

      expect(saved.id).toBeDefined();
      expect(saved.filePath).toBe('src/core.ts');
      expect(saved.content).toBe('export const ready = true;');

      // First read: retrieved from memory
      const memCached = await blobCacheManager.getCachedBlob('REPO-TEST', 'sha-001', 'src/core.ts');
      expect(memCached).not.toBeNull();
      expect(memCached!.fromMemory).toBe(true);
      expect(memCached!.content).toBe('export const ready = true;');
      expect(memCached!.etag).toBe('"etag-999"');

      // Clear memory cache, should read from DB and populate back into memory
      blobCacheManager.clearMemoryCache();
      const dbCached = await blobCacheManager.getCachedBlob('REPO-TEST', 'sha-001', 'src/core.ts');
      expect(dbCached).not.toBeNull();
      expect(dbCached!.fromMemory).toBe(false);
      expect(dbCached!.content).toBe('export const ready = true;');

      // Next read is from memory again
      const memCachedAgain = await blobCacheManager.getCachedBlob('REPO-TEST', 'sha-001', 'src/core.ts');
      expect(memCachedAgain!.fromMemory).toBe(true);
    });

    it('returns null when querying an un-cached blob', async () => {
      const result = await blobCacheManager.getCachedBlob('REPO-TEST', 'sha-001', 'nonexistent.ts');
      expect(result).toBeNull();
    });
  });

  describe('Storage Budget & Eviction Policy', () => {
    it('evicts least recently accessed un-annotated blobs when exceeding storage budget', async () => {
      // Set tiny storage budget (500 bytes)
      blobCacheManager.setBudgets(1024 * 1024, 500);

      const chunk = 'a'.repeat(300);

      // Save blob 1 (300 bytes) and mark it older
      await blobCacheManager.saveBlob('REPO-TEST', 'sha-001', 'file1.txt', chunk);
      await query(`UPDATE repository_cached_blobs SET last_accessed_at = '2020-01-01T00:00:00Z' WHERE file_path = 'file1.txt'`);

      // Save blob 2 (300 bytes) -> total 600 bytes > 500 bytes limit
      await blobCacheManager.saveBlob('REPO-TEST', 'sha-001', 'file2.txt', chunk);

      const eviction = await blobCacheManager.enforceEvictionPolicy();
      expect(eviction.evictedCount).toBeGreaterThanOrEqual(1);

      // file1 (older) should have been evicted, while file2 remains
      const file1 = await blobCacheManager.getCachedBlob('REPO-TEST', 'sha-001', 'file1.txt');
      expect(file1).toBeNull();
    });

    it('preserves blobs that have active user code annotations during eviction', async () => {
      // Start with normal budget so saving blobs does not trigger immediate eviction
      blobCacheManager.setBudgets(1024 * 1024, 1024 * 1024);

      const chunk = 'b'.repeat(300);
      await blobCacheManager.saveBlob('REPO-TEST', 'sha-001', 'annotated.txt', chunk);
      await blobCacheManager.saveBlob('REPO-TEST', 'sha-001', 'unannotated.txt', chunk);
      await query(`UPDATE repository_cached_blobs SET last_accessed_at = '2020-01-01T00:00:00Z' WHERE file_path = 'unannotated.txt'`);

      // Attach annotation to annotated.txt
      await query(`
        INSERT INTO code_annotations (
          id, repository_id, commit_sha, file_path, start_line, end_line, title, content, anchor_code_snippet
        ) VALUES (
          'ANN-PRESERVE', 'REPO-TEST', 'sha-001', 'annotated.txt', 1, 1, 'Note', 'Important note', 'bbbb'
        )
      `);

      // Now lower storage budget to 400 bytes (total blobs = 600 bytes)
      blobCacheManager.setBudgets(1024 * 1024, 400);

      // Trigger eviction
      const eviction = await blobCacheManager.enforceEvictionPolicy();
      expect(eviction.evictedCount).toBe(1);

      // Clear memory cache so we test DB state
      blobCacheManager.clearMemoryCache();

      // Annotated file must be preserved
      const preserved = await blobCacheManager.getCachedBlob('REPO-TEST', 'sha-001', 'annotated.txt');
      expect(preserved).not.toBeNull();

      // Unannotated file should be evicted
      const evicted = await blobCacheManager.getCachedBlob('REPO-TEST', 'sha-001', 'unannotated.txt');
      expect(evicted).toBeNull();
    });
  });
});
