import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Ensure standard paths
process.env.PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH || ''}`;

console.log(`[${new Date().toISOString()}] 🚀 Launching Study App production services...`);

let backendProcess = null;
let frontendProcess = null;
let isShuttingDown = false;

function startBackend() {
  console.log(`[${new Date().toISOString()}] Starting backend test server on port 4000...`);
  const child = spawn('/usr/local/bin/npm', ['--prefix', path.join(repoRoot, 'backend'), 'run', 'dev:test'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, PORT: '4000' }
  });

  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Backend process error:`, err);
  });

  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Backend exited with code ${code}, signal ${signal}`);
    if (!isShuttingDown) {
      console.log(`[${new Date().toISOString()}] Unexpected backend termination, shutting down to allow supervisor restart...`);
      shutdown(code || 1);
    }
  });

  return child;
}

function startFrontend() {
  console.log(`[${new Date().toISOString()}] Starting frontend preview gateway on port 3000...`);
  const child = spawn('/usr/local/bin/node', [path.join(repoRoot, 'frontend/scripts/start-dev.mjs')], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, VITE_BACKEND_URL: 'http://127.0.0.1:4000' }
  });

  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Frontend process error:`, err);
  });

  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Frontend exited with code ${code}, signal ${signal}`);
    if (!isShuttingDown) {
      console.log(`[${new Date().toISOString()}] Unexpected frontend termination, shutting down to allow supervisor restart...`);
      shutdown(code || 1);
    }
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[${new Date().toISOString()}] 🛑 Shutting down Study App services...`);

  if (backendProcess) {
    try {
      backendProcess.kill('SIGTERM');
    } catch (_) {}
  }

  if (frontendProcess) {
    try {
      frontendProcess.kill('SIGTERM');
    } catch (_) {}
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 1000);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('SIGHUP', () => shutdown(0));

backendProcess = startBackend();
frontendProcess = startFrontend();
