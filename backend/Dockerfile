# ========================================================
# Stage 1: Build TypeScript source to dist/
# ========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for optimal Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy TypeScript configuration and source files
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript
RUN npm run build

# ========================================================
# Stage 2: Minimal production runtime
# ========================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER node

EXPOSE 4000

# Built-in health check using Node's native fetch API
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
