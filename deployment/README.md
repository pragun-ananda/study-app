# Study App - Self-Hosting & Deployment Guide (Mac Mini)

This guide covers running the complete Study App stack (PostgreSQL 16, Node.js TypeScript Backend API, and Three.js/React Frontend SPA via Nginx) 24/7 on an Apple Silicon or Intel Mac Mini server.

---

## 1. Quick Start

### Step 1: Configure Environment Variables
Copy the production environment template:
```bash
cp deployment/.env.production.example deployment/.env.production
chmod 600 deployment/.env.production
```
Edit `deployment/.env.production`:
- **OpenAI (Default & Recommended)**: Set your `OPENAI_API_KEY=sk-...` (defaults to `gpt-4o-mini`).
- **Ollama (Optional Local AI)**:
  1. Leave `OPENAI_API_KEY` blank.
  2. Set `LLM_BASE_URL=http://host.docker.internal:11434/v1` and `LLM_MODEL=gemma4:e4b`.
  3. Ensure Ollama on macOS is listening on all interfaces by launching with `OLLAMA_HOST=0.0.0.0:11434 ollama serve` or setting `launchctl setenv OLLAMA_HOST "0.0.0.0:11434"`.

### Step 2: Launch Stack
Use the helper script:
```bash
./deployment/deploy.sh up
```
Or with docker compose directly:
```bash
docker compose --env-file deployment/.env.production -f deployment/docker-compose.prod.yml up -d --build
```

### Step 3: Verify Status
```bash
./deployment/deploy.sh status
```
Open `http://localhost:3000` in your browser.

---

## 2. Remote Access via Tailscale

Tailscale provides end-to-end encrypted private mesh access to your Mac Mini with zero open ports on your home router.

- **Mac Mini Tailscale IP**: `100.127.187.98`
- **Access from any device on your Tailscale network**:
  - Direct IP: `http://100.127.187.98:3000`
  - MagicDNS: `http://praguns-mac-mini:3000`

---

## 3. Mac Mini 24/7 Host Settings

To ensure uninterrupted uptime and automatic recovery across power outages:

```bash
# Prevent system sleep while idle
sudo pmset -a sleep 0
sudo pmset -a displaysleep 10
sudo pmset -a disksleep 0

# Automatically restart after a power loss
sudo pmset -a autorestart 1
```

### Important Headless Reboot Considerations:
1. **Automatic Login**: In **System Settings > Users & Groups**, enable **"Automatically log in as [Your User]"**. If FileVault is enabled without auto-login, macOS halts at the pre-boot disk unlock screen, preventing user agents and Docker Desktop from launching.
2. **Docker Startup**: In **Docker Desktop Settings > General**, ensure **"Start Docker Desktop when you log in"** is enabled.

---

## 4. Operational Commands

| Task | Command |
|---|---|
| View Status | `./deployment/deploy.sh status` |
| View Live Logs | `./deployment/deploy.sh logs` |
| View Specific Service Logs | `./deployment/deploy.sh logs backend` |
| Stop Stack | `./deployment/deploy.sh down` |
| Restart Stack | `./deployment/deploy.sh restart` |
| Run Database Backup | `./deployment/deploy.sh backup` |
| Update from Git & Rebuild | `./deployment/deploy.sh update` |

---

## 5. Automated Backups & Restoration

### Scheduling Daily Backups
Add a cron job to create daily timestamped backups at 3:00 AM:
```bash
crontab -e
```
Add the following entry:
```cron
0 3 * * * /Users/cheese/Desktop/study-app/deployment/backup-db.sh >> /Users/cheese/Desktop/study-app/deployment/backups/backup.log 2>&1
```

Backups are saved to `deployment/backups/` as compressed `.sql.gz` archives with a 14-day automatic rotation policy.

### Restoring a Backup
To restore a database snapshot into PostgreSQL:
```bash
gunzip -c deployment/backups/backup_study_db_YYYYMMDD_HHMMSS.sql.gz | docker exec -i study_app_postgres psql -U postgres -d study_db
```
