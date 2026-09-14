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

- **Tailscale IP**: Find your host's Tailscale IP (`tailscale ip -4`)
- **Access from any device on your Tailscale network**:
  - Direct IP: `http://<tailscale-ip>:3000`
  - MagicDNS: `http://<mac-mini-name>:3000`

### Secure HTTPS via Tailscale Serve
To serve the app over valid, browser-trusted HTTPS with automatic Let's Encrypt certificates (no certificate warnings on Chrome, Safari, iOS, or Android):
```bash
# Proxy port 3000 to HTTPS on your private Tailnet
tailscale serve --bg 3000

# Verify active proxy status and view your full HTTPS URL
tailscale serve status

# To disable or reset Tailscale serve
tailscale serve reset
```
Access via: `https://<mac-mini-name>.<tailnet-name>.ts.net`

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
| Force Immediate Update & Rebuild | `./deployment/deploy.sh update` |
| Start Background Auto-Deploy Daemon | `./deployment/deploy.sh autoupdate-start` |
| Stop Background Auto-Deploy Daemon | `./deployment/deploy.sh autoupdate-stop` |
| Check Auto-Deploy Daemon Status | `./deployment/deploy.sh autoupdate-status` |
| Stream Auto-Deploy Logs | `./deployment/deploy.sh autoupdate-logs` |
| Install Auto-Deploy LaunchAgent | `./deployment/deploy.sh autoupdate-install` |
| Uninstall Auto-Deploy LaunchAgent | `./deployment/deploy.sh autoupdate-uninstall` |

---

## 5. Automated Backups & Restoration

### Scheduling Daily Backups
Add a cron job to create daily timestamped backups at 3:00 AM:
```bash
crontab -e
```
Add the following entry (adjusting `/path/to/study-app` to your actual repo location):
```cron
0 3 * * * /path/to/study-app/deployment/backup-db.sh >> /path/to/study-app/deployment/backups/backup.log 2>&1
```

Backups are saved to `deployment/backups/` as compressed `.sql.gz` archives with a 14-day automatic rotation policy.

### Restoring a Backup
To restore a database snapshot into PostgreSQL:
```bash
gunzip -c deployment/backups/backup_study_db_YYYYMMDD_HHMMSS.sql.gz | docker exec -i study_app_postgres psql -U postgres -d study_db
```

---

## 6. Automated Continuous Deployment (Git Push Auto-Sync)

The Mac Mini runs a lightweight background daemon that periodically checks `origin/main` for new commits:
1. **Change Detection**: Compares local `HEAD` against `origin/main`. If there are no changes, it exits cleanly without CPU or disk churn.
2. **Safety Backup**: Creates an automatic snapshot of the PostgreSQL database before pulling any code.
3. **Fast-Forward Pull**: Executes `git pull --ff-only origin main`.
4. **Rebuild & Rolling Restart**: Rebuilds changed Docker images and recreates containers with zero manual steps.
5. **Image Pruning**: Automatically prunes orphaned Docker layers to conserve disk space.
6. **Health Verification**: Polls `http://localhost:3000/health` to confirm the gateway and backend are healthy.

### Running the Auto-Deploy Daemon
```bash
# Start background auto-update daemon (runs every 2 minutes in your user session)
./deployment/deploy.sh autoupdate-start

# Check daemon status and recent sync history
./deployment/deploy.sh autoupdate-status

# Watch live auto-update logs
./deployment/deploy.sh autoupdate-logs

# Stop background daemon
./deployment/deploy.sh autoupdate-stop
```

> [!NOTE]
> **macOS LaunchAgent Note**:
> macOS protects `~/Desktop` with Transparency, Consent, and Control (TCC) security restrictions, blocking background LaunchAgents that lack Full Disk Access from reading Desktop folders. The `autoupdate-start` command runs in your user session where Desktop permissions are active. For standalone system boot LaunchAgents (`autoupdate-install`), keep production clones in a standard user folder such as `~/projects/study-app` (where other 24/7 Mac Mini servers run).


