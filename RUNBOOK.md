# 📘 Letsm AI - Production RUNBOOK

> **Target environment**: Hostinger VPS · Ubuntu 24.04 · 16 GB RAM · 4 vCPU
> **Domain**: `letsm.ai` · **Maintainer**: `mazin298@gmail.com`

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [First-time VPS Deployment](#2-first-time-vps-deployment)
3. [DNS & SSL Setup](#3-dns--ssl-setup)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [Backups & Restore](#5-backups--restore)
6. [Monitoring](#6-monitoring)
7. [Common Operations](#7-common-operations)
8. [Rollback Procedure](#8-rollback-procedure)
9. [Disaster Recovery](#9-disaster-recovery)
10. [Troubleshooting Cheatsheet](#10-troubleshooting-cheatsheet)
11. [Security Hardening Checklist](#11-security-hardening-checklist)
12. [Cost Tracking](#12-cost-tracking)

---

## 1. Architecture Overview

```
                       Internet
                          │
                  ┌───────▼────────┐
                  │  Nginx (443)   │  ← TLS termination + reverse proxy
                  │   letsm_nginx  │     + rate limiting (10r/s API, 5r/m auth)
                  └─┬────────────┬─┘
            /api/  │            │  /
           ┌───────▼──┐   ┌─────▼─────┐
           │ Backend  │   │ Frontend  │  ← React static build (Nginx)
           │ FastAPI  │   │ (nginx)   │
           │ :8001    │   │  :80      │
           └─┬──────┬─┘   └───────────┘
             │      │
   ┌─────────▼─┐ ┌──▼──────┐    ┌──────────────┐
   │ MongoDB 7 │ │ Redis 7 │    │ WhatsApp svc │
   │  :27017   │ │  :6379  │    │  Baileys :3001
   └───────────┘ └─────────┘    └──────────────┘
```

All inter-service traffic stays inside the `letsm_net` Docker network.
Only `80` and `443` are exposed publicly (plus SSH on the configured port).

**Resource budget (approx):** Mongo 2-3GB · Backend 1-2GB · Redis 0.5GB · WhatsApp 1GB · Frontend+Nginx 0.3GB · OS+buffer 2GB → **~7-9 GB used** of 16 GB.

---

## 2. First-time VPS Deployment

### 2.1 Prep on your laptop
```bash
# Generate an SSH key if you don't have one
ssh-keygen -t ed25519 -C "letsm-deploy"
# Add the PUBLIC key to Hostinger panel → VPS → SSH Keys
```

### 2.2 First login + hardening
```bash
ssh root@<VPS_IP>

# Pull this repo (read-only deploy key is enough)
git clone https://github.com/<your-user>/letsm.git /tmp/letsm
cd /tmp/letsm

# Run the one-shot setup (creates user, UFW, Fail2ban, Docker, swap)
NEW_USER=letsm SSH_PORT=22 DOMAIN=letsm.ai ADMIN_EMAIL=mazin298@gmail.com \
  bash scripts/server-setup.sh

# Re-login as the new user from now on
ssh letsm@<VPS_IP>
```

### 2.3 App files & env
```bash
sudo mkdir -p /opt/letsm && sudo chown -R $USER:$USER /opt/letsm
cd /opt/letsm

# Pull / copy the production compose & nginx
git clone https://github.com/<your-user>/letsm.git .   # or scp

# Generate secrets
openssl rand -hex 32         # MONGO_ROOT_PASSWORD
openssl rand -hex 32         # REDIS_PASSWORD
openssl rand -hex 64         # JWT_SECRET_KEY

cp .env.production.example .env          # then edit values
cp .env.backup.example     .env.backup   # for backup.sh
chmod 600 .env .env.backup
```

### 2.4 Bring the stack up
```bash
cd /opt/letsm
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build

# Verify
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

### 2.5 Seed admin user
```bash
docker exec -it letsm_backend python -c "
import asyncio, bcrypt
from database import db
async def go():
    h = bcrypt.hashpw(b'__ChangeMe!__', bcrypt.gensalt()).decode()
    await db.users.update_one(
        {'email':'mazin298@gmail.com'},
        {'\$set':{'email':'mazin298@gmail.com','hashed_password':h,'role':'admin','name':'Mazin'}},
        upsert=True)
    print('Admin seeded')
asyncio.run(go())
"
```

---

## 3. DNS & SSL Setup

### 3.1 DNS records (at your registrar)
| Type | Name | Value | TTL |
|------|------|-------|-----|
| A    | @    | `<VPS_IP>` | 3600 |
| A    | www  | `<VPS_IP>` | 3600 |
| CAA  | @    | `0 issue "letsencrypt.org"` | 3600 |

Verify: `dig +short letsm.ai` should return the VPS IP.

### 3.2 Issue Let's Encrypt cert
```bash
cd /opt/letsm
DOMAIN=letsm.ai EMAIL=mazin298@gmail.com bash scripts/init-letsencrypt.sh
```
This script creates a dummy cert → starts nginx → requests real cert via webroot → reloads nginx.
Renewal runs automatically every 12 h via the `certbot` container.

### 3.3 Google OAuth redirect
In Google Cloud Console → APIs & Services → Credentials, add:
```
https://letsm.ai/api/calendar/google/callback
```
to the OAuth client's **Authorized redirect URIs**.

---

## 4. CI/CD Pipeline

### 4.1 GitHub repository secrets (Settings → Secrets → Actions)
| Secret | Description |
|--------|-------------|
| `VPS_HOST`            | Public IP or hostname of the VPS |
| `VPS_USER`            | `letsm` (the non-root sudoer) |
| `VPS_PORT`            | `22` (or custom port) |
| `VPS_SSH_KEY`         | **Private** SSH key (PEM, NO passphrase) |
| `GHCR_PULL_TOKEN`     | GitHub PAT with `read:packages` scope |
| `REACT_APP_BACKEND_URL` | `https://letsm.ai` |

### 4.2 Workflow
File: `.github/workflows/deploy.yml`

Trigger: `git push origin main` (or manual via "Run workflow" button)

Stages:
1. **build** → builds & pushes 3 Docker images to `ghcr.io/<owner>/letsm-{backend,frontend,whatsapp}:<sha>` (and `:latest`).
2. **deploy** → SCPs compose & nginx files to `/opt/letsm/`, SSHes in, `docker compose pull && up -d`, prunes old images, runs smoke test against `https://letsm.ai/api/health`.

### 4.3 Manual deploy
```bash
gh workflow run deploy.yml          # via GitHub CLI
# OR push to main:
git push origin main
```

---

## 5. Backups & Restore

### 5.1 Backblaze B2 setup (one-time, ~3 min)
1. Sign up at <https://www.backblaze.com/cloud-storage>
2. Create a **Private** bucket: `letsm-backups` (region: us-west-002 is cheapest)
3. Generate an **Application Key**:
   - Bucket: `letsm-backups`
   - Capabilities: `listBuckets, listFiles, readFiles, writeFiles, deleteFiles`
4. Set lifecycle: "Keep only the last version of the file and hide it after 30 days, then delete."
5. Paste `keyID` and `applicationKey` into `/opt/letsm/.env.backup`.

### 5.2 What's backed up
- **MongoDB** full dump (gzipped archive)
- **WhatsApp `auth_info` volume** (so users don't have to relink after disaster)

### 5.3 Schedule
Installed by `server-setup.sh`:
```
/etc/cron.d/letsm-backup → 0 3 * * * (daily 03:00 UTC)
```

### 5.4 Manual backup
```bash
sudo /opt/letsm/scripts/backup.sh
tail -f /var/log/letsm-backup.log
```

### 5.5 Restore
```bash
# Latest:
sudo /opt/letsm/scripts/restore.sh latest

# Specific file:
sudo /opt/letsm/scripts/restore.sh letsm-letsm_production-20260215T030000Z.gz
```

### 5.6 Verify a backup (recommended monthly)
```bash
# Pull a backup and restore into a throwaway container
b2 file download b2://letsm-backups/mongo/<file>.gz /tmp/dump.gz
docker run --rm -d --name mongo-test -p 27018:27017 mongo:7
cat /tmp/dump.gz | docker exec -i mongo-test mongorestore --gzip --archive
docker exec mongo-test mongosh --eval 'db.getSiblingDB("letsm_production").users.countDocuments()'
docker rm -f mongo-test
```

### 5.7 Cost estimate
- 50 GB stored × $0.006/GB = **$0.30/month**
- ~5 GB egress/month (restore tests) × $0.01/GB = **$0.05**
- **Total: < $0.50/month**

---

## 6. Monitoring & Admin Panels

All admin panels bind to **127.0.0.1 only** — they are NOT exposed to the internet. You access them via SSH tunnel from your local machine.

### 6.1 One-command access (recommended)
From your **local** machine:
```bash
bash scripts/admin-tunnel.sh
# Or with custom VPS:
VPS=76.13.220.229 USER_VPS=letsm bash scripts/admin-tunnel.sh
```
This opens 5 tunnels at once. Leave it running and open these URLs in your browser:

| Panel | URL | First login |
|-------|-----|------------|
| 📊 **Portainer** (Docker mgmt) | http://localhost:9000 | Create admin on first visit |
| 📜 **Dozzle** (live logs)      | http://localhost:8080 | No auth (LAN-only) |
| 💚 **Uptime Kuma** (uptime)    | http://localhost:3001 | Create admin on first visit |
| 📈 **Netdata** (system metrics)| http://localhost:19999 | No auth (LAN-only) |
| 🗄️ **Mongo Express** (DB UI)   | http://localhost:8081 | `ME_USER` / `ME_PASSWORD` from `.env` |

### 6.2 Manual SSH tunnel (single panel)
```bash
ssh -L 9000:127.0.0.1:9000 letsm@76.13.220.229
```

### 6.3 Uptime Kuma setup (recommended monitors)
- `https://letsm.ai/api/health` — every 60s
- `https://letsm.ai/` — every 60s
- TCP `letsm.ai:443` — every 5 min (catches cert expiry)
- Notification: Telegram or Email

### 6.4 Resource watch from CLI
```bash
docker stats --no-stream
htop
df -h
docker system df
```

### 6.5 Log tails
```bash
docker compose -f /opt/letsm/docker-compose.prod.yml logs -f --tail=200 backend
docker compose -f /opt/letsm/docker-compose.prod.yml logs -f --tail=200 nginx
tail -f /var/log/letsm-backup.log
journalctl -u fail2ban -f
```

---

## 7. Common Operations

### Restart a service
```bash
docker compose -f /opt/letsm/docker-compose.prod.yml restart backend
```

### Apply env changes
```bash
vim /opt/letsm/.env
docker compose -f /opt/letsm/docker-compose.prod.yml up -d --force-recreate backend
```

### Shell into a container
```bash
docker exec -it letsm_backend bash
docker exec -it letsm_mongo mongosh -u letsm_admin -p
```

### Tail just errors
```bash
docker compose -f /opt/letsm/docker-compose.prod.yml logs --tail=500 backend | grep -E "ERROR|CRITICAL|Traceback"
```

### Scale Uvicorn workers (e.g., during a traffic spike)
Edit `Dockerfile.backend` CMD `--workers 4` → `--workers 8`, rebuild, push, deploy.

---

## 8. Rollback Procedure

> Every CI build tags images with the commit SHA, so any past deploy is one command away.

```bash
ssh letsm@<VPS_IP>
cd /opt/letsm

# 1. List recent tags
docker images | grep letsm

# 2. Pin to a previous SHA
export IMAGE_TAG=<previous-sha>
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml pull
docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml up -d

# 3. Smoke test
curl -fsS https://letsm.ai/api/health
```

If a bad migration corrupted the DB, follow [Disaster Recovery](#9-disaster-recovery).

---

## 9. Disaster Recovery

**RPO** (Recovery Point Objective): ≤ 24 h (daily backups)
**RTO** (Recovery Time Objective): ≤ 60 min on a fresh VPS

Procedure:
1. Spin up a fresh Hostinger VPS (Ubuntu 24.04).
2. Run `scripts/server-setup.sh` (5 min).
3. Re-create `/opt/letsm/.env` & `.env.backup` from your password manager.
4. `docker compose -f docker-compose.prod.yml up -d` (5-10 min build).
5. `scripts/restore.sh latest` (5-15 min depending on DB size).
6. Re-issue SSL: `scripts/init-letsencrypt.sh`.
7. Update DNS A record to the new IP (TTL 3600 → ~1 h propagation).
8. Verify: `curl https://letsm.ai/api/health`.

> 💡 Keep `.env` and `.env.backup` in a password manager (1Password / Bitwarden). They are the only thing **NOT** in git.

---

## 10. Troubleshooting Cheatsheet

| Symptom | First check | Fix |
|--------|-------------|-----|
| `502 Bad Gateway` | `docker compose ps` | Backend container down → `docker compose logs backend` |
| `503` after deploy | health check failing | `curl http://localhost:8001/api/health` inside backend container |
| WhatsApp not responding | `docker logs letsm_whatsapp` | Re-scan QR if session expired (auth volume corruption) |
| MongoDB OOM | `docker stats` | Lower `--wiredTigerCacheSizeGB` or upgrade RAM |
| SSL cert expired | `openssl s_client -connect letsm.ai:443 -servername letsm.ai` | `docker compose restart certbot && exec nginx -s reload` |
| Stripe webhook 404 | nginx access log | Ensure path is under `/api/` |
| High CPU | `docker stats` | Likely AI request burst — check `/api/admin/usage` |
| Disk full | `df -h && docker system df` | `docker image prune -af && docker volume prune` |
| Fail2ban banning legit IPs | `fail2ban-client status sshd` | `fail2ban-client set sshd unbanip <ip>` |

---

## 11. Security Hardening Checklist

Run through this list **once per quarter**.

- [ ] `unattended-upgrades` is enabled (`apt-config dump | grep -i unattended`)
- [ ] SSH password auth is **off** (`grep PasswordAuthentication /etc/ssh/sshd_config`)
- [ ] Root SSH login is `prohibit-password` only
- [ ] UFW allows only `22/80/443`
- [ ] Fail2ban active: `fail2ban-client status`
- [ ] All `.env` files are `chmod 600` and not in git
- [ ] MongoDB has auth enabled and is **not** exposed to the host (`netstat -tlnp | grep 27017` should show nothing public)
- [ ] Redis requires password (`docker exec letsm_redis redis-cli ping` should error without `-a`)
- [ ] Stripe webhooks use signature verification
- [ ] CORS_ORIGINS doesn't contain `*`
- [ ] Nginx security headers present: `curl -I https://letsm.ai | grep -iE 'strict|frame|content-type-options'`
- [ ] SSL grade A on https://www.ssllabs.com/ssltest/analyze.html?d=letsm.ai
- [ ] Latest Docker image tags are <30 days old
- [ ] DB backups verified (do a test restore monthly)
- [ ] GitHub repo: branch protection on `main`, secrets are not echoed in logs

---

## 12. Cost Tracking

| Item | Monthly |
|------|---------|
| Hostinger VPS (KVM 4, 16 GB) | ~$15-30 |
| Domain `letsm.ai` (amortised) | ~$3 |
| Backblaze B2 storage | < $0.50 |
| Let's Encrypt SSL | $0 |
| GitHub Actions (2000 min free) | $0 |
| Resend (3 K emails free, then $20) | $0-20 |
| **Fixed total** | **~$20-35** |
| OpenAI GPT-5.2 (variable) | $50-200 |
| Stripe fees | 2.9% + $0.30/txn |

---

## Quick Reference

```bash
# Up
docker compose -f /opt/letsm/docker-compose.prod.yml up -d

# Down (preserves data)
docker compose -f /opt/letsm/docker-compose.prod.yml down

# Logs
docker compose -f /opt/letsm/docker-compose.prod.yml logs -f --tail=200

# Backup now
sudo /opt/letsm/scripts/backup.sh

# Restore latest
sudo /opt/letsm/scripts/restore.sh latest

# Rollback to previous SHA
IMAGE_TAG=<sha> docker compose -f docker-compose.prod.yml -f docker-compose.deploy.yml up -d
```

---

_Last updated: 2026-02 · Maintained alongside `docker-compose.prod.yml`_
