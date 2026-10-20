# Study App (`study-app`)

A high-performance interactive 3D knowledge graph, study companion, and telemetry platform.

---

## Project Structure

```
study-app/
├── frontend/                  # React + Three.js (R3F) + Tailwind 3D Telemetry HUD
├── backend/                   # Core Backend service (Graph APIs, Prerequisite DAG, LLM agents)
├── storage/                   # Database schemas, pgvector configuration & seeds (schema.sql, seed.sql)
└── deployment/                # Dockerfiles & local/cloud deployment orchestration
```

---

## Component Roles

- **`/frontend`**: The interactive WebGL 3D knowledge graph UI, HUD overlay, audio-reactive synth, and study tools.
- **`/backend`**: The core API service for graph queries, prerequisite pathfinding, hybrid search, and note management.
- **`/storage`**: PostgreSQL schema definitions (`schema.sql`), `pgvector` configuration, and initial domain seed data (`seed.sql`).
- **`/deployment`**: Containerization, `docker-compose.yml`, and cloud deployment configurations.

---

## Deployment & Self-Hosting

The app can be run 24/7 on a home server (such as a Mac Mini) using Docker Compose and Nginx, with remote mesh access via Tailscale and continuous git auto-deployment.

### Quick Start
```bash
# 1. Start production stack (PostgreSQL, Backend API, Nginx Gateway)
./deployment/deploy.sh up

# 2. Start automated git auto-deployment daemon (checks origin/main every 2m)
./deployment/deploy.sh autoupdate-start

# 3. Check health and container status
./deployment/deploy.sh status
```

See **[deployment/README.md](deployment/README.md)** for complete documentation on environment variables, Tailscale HTTPS setup, automated backups, and 24/7 host resilience.
