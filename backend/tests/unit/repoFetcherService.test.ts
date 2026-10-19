import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseGitHubRepoIdentifier,
  buildHierarchicalTree,
  repoFetcherService
} from '../../src/services/repoFetcherService.js';
import { setupTestDatabase } from '../helpers.js';

describe('Unit: RepoFetcherService (backend/src/services/repoFetcherService.ts)', () => {
  beforeEach(() => {
    setupTestDatabase();
    repoFetcherService.clearTreeCache();
  });

  describe('parseGitHubRepoIdentifier', () => {
    it('parses standard https GitHub URLs', () => {
      const res = parseGitHubRepoIdentifier('https://github.com/redis/redis');
      expect(res.owner).toBe('redis');
      expect(res.name).toBe('redis');
      expect(res.fullName).toBe('redis/redis');
    });

    it('parses .git URLs and git@ shorthand', () => {
      const res1 = parseGitHubRepoIdentifier('https://github.com/expressjs/express.git');
      expect(res1.fullName).toBe('expressjs/express');

      const res2 = parseGitHubRepoIdentifier('git@github.com:facebook/react.git');
      expect(res2.fullName).toBe('facebook/react');
    });

    it('parses owner/repo shorthand notation', () => {
      const res = parseGitHubRepoIdentifier('tokio-rs/tokio');
      expect(res.owner).toBe('tokio-rs');
      expect(res.name).toBe('tokio');
      expect(res.fullName).toBe('tokio-rs/tokio');
    });

    it('throws on invalid or non-GitHub URLs', () => {
      expect(() => parseGitHubRepoIdentifier('invalid-url-with-no-slash')).toThrow();
    });
  });

  describe('buildHierarchicalTree', () => {
    it('converts flat file paths into a nested directory hierarchy', () => {
      const flat = [
        { path: 'README.md', type: 'blob' as const, size: 500 },
        { path: 'src/index.ts', type: 'blob' as const, size: 1200 },
        { path: 'src/utils/math.ts', type: 'blob' as const, size: 300 },
        { path: 'tests/index.test.ts', type: 'blob' as const, size: 800 }
      ];

      const tree = buildHierarchicalTree(flat);

      // Root should contain README.md, src, and tests
      const names = tree.map((n) => n.name);
      expect(names).toContain('README.md');
      expect(names).toContain('src');
      expect(names).toContain('tests');

      const srcDir = tree.find((n) => n.name === 'src');
      expect(srcDir).toBeDefined();
      expect(srcDir!.type).toBe('dir');
      expect(srcDir!.children).toBeDefined();

      const srcChildNames = srcDir!.children!.map((c) => c.name);
      expect(srcChildNames).toContain('index.ts');
      expect(srcChildNames).toContain('utils');

      const utilsDir = srcDir!.children!.find((c) => c.name === 'utils');
      expect(utilsDir!.type).toBe('dir');
      expect(utilsDir!.children![0].name).toBe('math.ts');
    });
  });

  describe('importRepository & fetchRepoTree & fetchFileBlob', () => {
    it('imports a GitHub repository in test mode with deterministic metadata', async () => {
      const repo = await repoFetcherService.importRepository({
        fullName: 'redis/redis'
      });

      expect(repo.id).toBeDefined();
      expect(repo.name).toBe('redis');
      expect(repo.owner).toBe('redis');
      expect(repo.fullName).toBe('redis/redis');
      expect(repo.originType).toBe('GITHUB');
      expect(repo.starsCount).toBe(64000);
    });

    it('imports a custom repository with custom files and lazy fetches them', async () => {
      const repo = await repoFetcherService.importRepository({
        originType: 'CUSTOM',
        name: 'my-algorithms',
        owner: 'student',
        customFiles: [
          { path: 'README.md', content: '# Algorithm Studies' },
          { path: 'src/quicksort.py', content: 'def quicksort(arr): return arr' }
        ]
      });

      expect(repo.originType).toBe('CUSTOM');
      expect(repo.fullName).toBe('student/my-algorithms');

      // Fetch tree
      const manifest = await repoFetcherService.fetchRepoTree(repo.id);
      expect(manifest.totalFiles).toBe(2);

      const rootNames = manifest.tree.map((n) => n.name);
      expect(rootNames).toContain('README.md');
      expect(rootNames).toContain('src');

      // Fetch file blob
      const fileBlob = await repoFetcherService.fetchFileBlob(repo.id, 'src/quicksort.py');
      expect(fileBlob.content).toContain('def quicksort');
      expect(fileBlob.fromCache).toBe(true);
    });

    it('lazy fetches synthetic source code in test mode for un-cached files', async () => {
      const repo = await repoFetcherService.importRepository({
        fullName: 'expressjs/express'
      });

      const blob = await repoFetcherService.fetchFileBlob(repo.id, 'lib/express.js');
      expect(blob.content).toContain('Study App Code Engine: lib/express.js');

      // Subsequent fetch should hit cache
      const cached = await repoFetcherService.fetchFileBlob(repo.id, 'lib/express.js');
      expect(cached.fromCache).toBe(true);
    });
  });
});
