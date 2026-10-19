import zlib from 'zlib';
import { query } from '../db.js';
import { generateEntityId } from '../utils/id.js';
import { CachedBlobDTO, RepositoryCachedBlobRow } from '../types.js';

export interface InMemoryBlobEntry {
  content: string;
  etag: string | null;
  fileSizeBytes: number;
  lastAccessedAt: number;
}

// Ultra-lean Mac mini budgets (25MB RAM hot cache, 100MB DB cache ceiling)
export const DEFAULT_MAX_MEMORY_BYTES = 25 * 1024 * 1024;
export const DEFAULT_MAX_STORAGE_BYTES = 100 * 1024 * 1024;

class BlobCacheManager {
  private memoryCache = new Map<string, InMemoryBlobEntry>();
  private currentMemoryBytes = 0;
  private maxMemoryBytes = DEFAULT_MAX_MEMORY_BYTES;
  private maxStorageBytes = DEFAULT_MAX_STORAGE_BYTES;

  public setBudgets(memoryBytes: number, storageBytes: number) {
    this.maxMemoryBytes = memoryBytes;
    this.maxStorageBytes = storageBytes;
  }

  private getCacheKey(repositoryId: string, commitSha: string, filePath: string): string {
    return `${repositoryId}:${commitSha}:${filePath}`;
  }

  public compressContent(raw: string): { compressed: string; isCompressed: boolean; encoding: string } {
    try {
      const buffer = Buffer.from(raw, 'utf-8');
      // If content is very small (< 128 bytes), compression adds overhead, so store raw
      if (buffer.length < 128) {
        return { compressed: raw, isCompressed: false, encoding: 'utf-8' };
      }
      const deflated = zlib.deflateSync(buffer);
      return {
        compressed: deflated.toString('base64'),
        isCompressed: true,
        encoding: 'gzip-base64'
      };
    } catch (err) {
      console.warn('[BLOB_CACHE_COMPRESS_ERROR] Falling back to raw utf-8:', err);
      return { compressed: raw, isCompressed: false, encoding: 'utf-8' };
    }
  }

  public decompressContent(stored: string, isCompressed: boolean, encoding: string): string {
    if (!isCompressed && encoding === 'utf-8') {
      return stored;
    }
    try {
      if (encoding === 'gzip-base64' || isCompressed) {
        const buffer = Buffer.from(stored, 'base64');
        return zlib.inflateSync(buffer).toString('utf-8');
      }
      return stored;
    } catch (err) {
      console.error('[BLOB_CACHE_DECOMPRESS_ERROR]:', err);
      return stored;
    }
  }

  private putMemory(key: string, entry: InMemoryBlobEntry) {
    // If already exists, subtract old size first
    const existing = this.memoryCache.get(key);
    if (existing) {
      this.currentMemoryBytes -= existing.fileSizeBytes;
    }

    // Evict oldest entries if exceeding memory budget
    while (
      this.currentMemoryBytes + entry.fileSizeBytes > this.maxMemoryBytes &&
      this.memoryCache.size > 0
    ) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (!oldestKey) break;
      const oldest = this.memoryCache.get(oldestKey);
      if (oldest) {
        this.currentMemoryBytes -= oldest.fileSizeBytes;
      }
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, entry);
    this.currentMemoryBytes += entry.fileSizeBytes;
  }

  public async getCachedBlob(
    repositoryId: string,
    commitSha: string,
    filePath: string
  ): Promise<{ content: string; fileSizeBytes: number; etag: string | null; fromMemory: boolean } | null> {
    const key = this.getCacheKey(repositoryId, commitSha, filePath);

    // 1. Check in-memory hot cache
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      memEntry.lastAccessedAt = Date.now();
      // Re-insert to refresh LRU order
      this.memoryCache.delete(key);
      this.memoryCache.set(key, memEntry);
      return {
        content: memEntry.content,
        fileSizeBytes: memEntry.fileSizeBytes,
        etag: memEntry.etag,
        fromMemory: true
      };
    }

    // 2. Check PostgreSQL database cache
    const res = await query<RepositoryCachedBlobRow>(
      `SELECT * FROM repository_cached_blobs 
       WHERE repository_id = $1 AND commit_sha = $2 AND file_path = $3`,
      [repositoryId, commitSha, filePath]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const rawContent = this.decompressContent(row.content, row.is_compressed, row.encoding);

    // Asynchronously update last_accessed_at in the database
    query(
      `UPDATE repository_cached_blobs 
       SET last_accessed_at = NOW() 
       WHERE id = $1`,
      [row.id]
    ).catch((err) => console.warn('[BLOB_CACHE_TOUCH_ERROR]:', err));

    // Place into in-memory hot cache
    this.putMemory(key, {
      content: rawContent,
      etag: row.etag,
      fileSizeBytes: row.file_size_bytes,
      lastAccessedAt: Date.now()
    });

    return {
      content: rawContent,
      fileSizeBytes: row.file_size_bytes,
      etag: row.etag,
      fromMemory: false
    };
  }

  public async saveBlob(
    repositoryId: string,
    commitSha: string,
    filePath: string,
    content: string,
    etag?: string | null
  ): Promise<CachedBlobDTO> {
    const fileSizeBytes = Buffer.byteLength(content, 'utf-8');
    const { compressed, isCompressed, encoding } = this.compressContent(content);
    const id = generateEntityId('BLOB');
    const cleanEtag = etag || null;

    const res = await query<RepositoryCachedBlobRow>(
      `INSERT INTO repository_cached_blobs (
         id, repository_id, commit_sha, file_path, file_size_bytes, content, encoding, is_compressed, etag, last_accessed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (repository_id, commit_sha, file_path) 
       DO UPDATE SET 
         file_size_bytes = EXCLUDED.file_size_bytes,
         content = EXCLUDED.content,
         encoding = EXCLUDED.encoding,
         is_compressed = EXCLUDED.is_compressed,
         etag = EXCLUDED.etag,
         last_accessed_at = NOW()
       RETURNING *`,
      [id, repositoryId, commitSha, filePath, fileSizeBytes, compressed, encoding, isCompressed, cleanEtag]
    );

    const row = res.rows[0];
    const key = this.getCacheKey(repositoryId, commitSha, filePath);

    this.putMemory(key, {
      content,
      etag: cleanEtag,
      fileSizeBytes,
      lastAccessedAt: Date.now()
    });

    // Check storage budget and evict if necessary
    this.enforceEvictionPolicy().catch((err) =>
      console.warn('[BLOB_CACHE_EVICTION_ERROR]:', err)
    );

    return {
      id: row.id,
      repositoryId: row.repository_id,
      commitSha: row.commit_sha,
      filePath: row.file_path,
      fileSizeBytes: row.file_size_bytes,
      content,
      encoding: row.encoding,
      isCompressed: row.is_compressed,
      etag: row.etag,
      lastAccessedAt: new Date(row.last_accessed_at).toISOString(),
      createdAt: new Date(row.created_at).toISOString()
    };
  }

  public evictMemory(key: string) {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.currentMemoryBytes -= entry.fileSizeBytes;
      this.memoryCache.delete(key);
    }
  }

  public async enforceEvictionPolicy(): Promise<{ evictedCount: number; freedBytes: number }> {
    const sumRes = await query<{ total_bytes: string | number }>(
      `SELECT COALESCE(SUM(file_size_bytes), 0) AS total_bytes FROM repository_cached_blobs`
    );
    const totalBytes = Number(sumRes.rows[0]?.total_bytes || 0);

    if (totalBytes <= this.maxStorageBytes) {
      return { evictedCount: 0, freedBytes: 0 };
    }

    // Target reducing to 80% of max capacity
    const targetBytes = this.maxStorageBytes * 0.8;
    const bytesToFree = totalBytes - targetBytes;

    // Delete oldest accessed blobs that DO NOT have user annotations attached
    const candidateBlobs = await query<{
      id: string;
      repository_id: string;
      commit_sha: string;
      file_path: string;
      file_size_bytes: number;
    }>(
      `SELECT b.id, b.repository_id, b.commit_sha, b.file_path, b.file_size_bytes 
       FROM repository_cached_blobs b
       LEFT JOIN code_annotations a 
         ON a.repository_id = b.repository_id 
         AND a.commit_sha = b.commit_sha 
         AND a.file_path = b.file_path
       WHERE a.id IS NULL
       ORDER BY b.last_accessed_at ASC, b.created_at ASC
       LIMIT 100`
    );

    let freedBytes = 0;
    const idsToDelete: string[] = [];

    for (const b of candidateBlobs.rows) {
      idsToDelete.push(b.id);
      this.evictMemory(this.getCacheKey(b.repository_id, b.commit_sha, b.file_path));
      freedBytes += Number(b.file_size_bytes);
      if (freedBytes >= bytesToFree) break;
    }

    if (idsToDelete.length > 0) {
      const placeholders = idsToDelete.map((_, i) => `$${i + 1}`).join(', ');
      await query(
        `DELETE FROM repository_cached_blobs WHERE id IN (${placeholders})`,
        idsToDelete
      );
    }

    return {
      evictedCount: idsToDelete.length,
      freedBytes
    };
  }

  public clearMemoryCache(): void {
    this.memoryCache.clear();
    this.currentMemoryBytes = 0;
  }

  public getMemoryStats() {
    return {
      entryCount: this.memoryCache.size,
      currentBytes: this.currentMemoryBytes,
      maxBytes: this.maxMemoryBytes
    };
  }
}

export const blobCacheManager = new BlobCacheManager();
