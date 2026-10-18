import { existsSync } from 'fs';
import { build, preview } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const distPath = path.resolve(frontendRoot, 'dist');

if (!existsSync(distPath)) {
  console.log('Building production bundle for fast preview...');
  await build({
    configFile: false,
    root: frontendRoot,
    plugins: [react()]
  });
}

const server = await preview({
  configFile: false,
  root: frontendRoot,
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:4000',
        changeOrigin: true
      }
    }
  }
});

server.printUrls();
