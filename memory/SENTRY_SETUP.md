# Sentry Setup — Quick Guide

## 1. Create Sentry account (free tier: 5,000 errors/month)
- Go to https://sentry.io/signup/
- Choose "Self-host trial" → "Try Sentry SaaS"
- Organization name: `Letsm`

## 2. Create TWO projects
### React Frontend project
- Platform: **React**
- Project name: `letsm-frontend`
- Copy the DSN shown (format: `https://xxx@oXXX.ingest.sentry.io/XXX`)

### FastAPI Backend project
- Platform: **FastAPI**
- Project name: `letsm-backend`
- Copy the DSN

## 3. Add DSNs to the production VPS (.env files)

### `frontend/.env` (on VPS):
```
REACT_APP_SENTRY_DSN=<paste your frontend DSN>
REACT_APP_SENTRY_ENVIRONMENT=production
```
**Important:** Frontend env vars are baked at build time. After updating, rebuild the frontend image (push to GitHub → auto-deploy will rebuild).

### `backend/.env` (on VPS):
```
SENTRY_DSN=<paste your backend DSN>
SENTRY_ENVIRONMENT=production
```
Backend reads at runtime — just restart the backend container.

## 4. Optional: Slack alerts
In Sentry → Settings → Integrations → Slack → "Add to Workspace" → choose your workspace.
Then create alerts: `Alerts → New Alert → Issues → "When a new issue is created" → Action: Slack`.

## 5. Verify it works
- Visit your production site
- Open browser console and run: `throw new Error("Sentry test")`
- Within 1 minute, the error should appear in Sentry's React project dashboard

## 6. Local development
If you don't set `REACT_APP_SENTRY_DSN` or `SENTRY_DSN` locally, Sentry is automatically DISABLED. No errors are sent. The app works normally without it.

## Cost estimate
- Free tier: 5K errors/month → enough for early stage
- Team plan: $26/month → 50K errors + 50K performance events
