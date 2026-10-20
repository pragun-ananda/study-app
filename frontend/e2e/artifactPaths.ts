import { mkdirSync } from 'node:fs';
import path from 'node:path';

export const E2E_ARTIFACT_DIR = path.resolve(process.cwd(), 'test-results', 'artifacts');

mkdirSync(E2E_ARTIFACT_DIR, { recursive: true });
