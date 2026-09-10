# ========================================================
# Stage 1: Build React/Three.js static SPA bundle
# ========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy configuration and source files
COPY . .

# Build production bundle with Vite
RUN npm run build

# ========================================================
# Stage 2: Lightweight Nginx Web Server & Reverse Proxy
# ========================================================
FROM nginx:1.27-alpine AS runner

# Copy compiled static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy default nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Basic healthcheck checking if Nginx serves index.html
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
