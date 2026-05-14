# 🚀 Letsm AI — Production Deployment

Production-grade Docker stack for **letsm.ai** on Hostinger VPS (16 GB / 4 vCPU / Ubuntu 24.04).

📘 **Full guide:** [`RUNBOOK.md`](./RUNBOOK.md)

---

## File Map

| File | Purpose |
|------|---------|
| `Dockerfile.backend` | FastAPI (4 uvicorn workers, non-root user, healthcheck) |
| `Dockerfile.frontend` | React multi-stage build → nginx static serve |
| `Dockerfile.whatsapp` | Node.js Baileys service |
| `docker-compose.prod.yml` | Full stack: mongo + redis + backend + frontend + whatsapp + nginx + certbot + uptime-kuma |
| `docker-compose.deploy.yml` | Override for CI/CD (uses pre-built images from GHCR) |
| `nginx/letsm.ai.conf` | Reverse proxy + TLS + rate limiting + security headers |
| `nginx/nginx.conf` | Main nginx config (tuned for 4 vCPU) |
| `nginx/frontend.conf` | Static-serve config inside frontend container |
| `.github/workflows/deploy.yml` | GitHub Actions CI/CD (build → GHCR → SSH deploy) |
| `scripts/server-setup.sh` | One-shot VPS hardening (UFW, Fail2ban, Docker, swap, user) |
| `scripts/init-letsencrypt.sh` | First-time SSL provisioning |
| `scripts/backup.sh` | Daily Mongo + WhatsApp auth backup → Backblaze B2 |
| `scripts/restore.sh` | Restore Mongo from B2 backup |
| `.env.production.example` | Template for `/opt/letsm/.env` |
| `.env.backup.example` | Template for `/opt/letsm/.env.backup` |

---

## 30-Second Quick Start

```bash
# On a FRESH VPS as root:
git clone https://github.com/<you>/letsm.git /tmp/letsm && cd /tmp/letsm
bash scripts/server-setup.sh                       # hardens the box

# As the new user `letsm`:
sudo mkdir -p /opt/letsm && sudo chown -R $USER /opt/letsm
cd /opt/letsm && git clone https://github.com/<you>/letsm.git .
cp .env.production.example .env       # ← fill secrets
cp .env.backup.example .env.backup    # ← fill B2 keys

docker compose -f docker-compose.prod.yml up -d --build
DOMAIN=letsm.ai EMAIL=mazin298@gmail.com bash scripts/init-letsencrypt.sh

curl https://letsm.ai/api/health      # → {"status":"healthy",...}
```

That's it. Push to `main` from now on, GitHub Actions handles the rest.
