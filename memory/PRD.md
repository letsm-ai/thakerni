# Letsm AI - Product Requirements Document

## Original Problem Statement
Build an AI assistant SaaS platform with:
- AI-powered conversational assistant using OpenAI GPT-5.2
- Task management, Reminders & calendar events
- WhatsApp integration, Voice input, Productivity stats
- JWT + Google OAuth authentication
- Full Arabic language & RTL layout support
- Stripe subscription billing (Free/Pro/Business)
- Professional landing page, Admin Dashboard, Team features

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + Phosphor Icons + Recharts
- **Backend**: FastAPI (Python) + MongoDB + APScheduler
- **AI**: OpenAI GPT-5.2 via Emergent Integrations
- **Auth**: JWT (in-memory token store) + Emergent Google OAuth
- **Payments**: Stripe via Emergent StripeCheckout
- **WhatsApp**: Baileys v7 Node.js -> FastAPI AI endpoint
- **Email**: Resend (configurable via Profile > Email Config)
- **Scheduler**: APScheduler for weekly email digests (Sunday 09:00 UTC)

## Backend Architecture (Post-Refactor)
```
/app/backend/
├── server.py          (79 lines — thin app orchestrator)
├── database.py        (DB connection + shared config)
├── models.py          (All Pydantic models)
├── auth_helpers.py    (JWT auth, password hashing, get_current_user)
├── routes/
│   ├── auth.py        (register, login, OAuth session, me, logout)
│   ├── chat.py        (AI chat, guest chat, NLP task/reminder parsing)
│   ├── tasks.py       (Task CRUD)
│   ├── reminders.py   (Reminder CRUD)
│   ├── calendar.py    (Calendar event CRUD)
│   ├── misc.py        (Notifications, profile, stats, health check)
│   ├── services.py    (Stripe, data export, WhatsApp proxy)
│   ├── email.py       (Email digest, preferences, config)
│   ├── admin.py       (Admin dashboard endpoints)
│   └── teams.py       (Team collaboration endpoints)
└── tests/
```

## All Implemented Features

### Core AI
- GPT-5.2 AI chat with Arabic/English support
- AI-powered task/reminder creation from natural language
- Floating AI chat widget + Live Demo chat on landing page
- WhatsApp 2-way AI chat forwarding

### Productivity
- Tasks CRUD with priority levels
- Reminders CRUD with scheduling
- Calendar events CRUD
- Productivity statistics dashboard with streaks
- Data export: JSON + CSV format toggle (Tasks/Reminders/Conversations/All)

### Auth & Billing
- JWT + Emergent Google OAuth
- In-memory token store (XSS-safe, no localStorage for auth)
- Stripe subscription billing (Free/Pro/Business)
- Checkout sessions, payment polling, webhooks

### Communication
- WhatsApp QR scan + 2-way AI messaging (Baileys v7)
- Browser notifications for reminders + team events
- Weekly email digest with CRON scheduling
- Email preferences (opt-in/out toggles)
- Resend API key configuration UI (admin only, with test email)

### Admin Dashboard (RBAC)
- Roles: admin, developer, operations, viewer
- Pages: Overview, Users, Analytics, Billing, System Health, Audit Logs
- IP Geolocation on login/signup

### Team Features (Business Plan)
- Team management (create/invite/remove/roles)
- Shared tasks, reminders, conversations
- Team chat with real-time messaging
- Team analytics + per-seat billing ($10/seat/mo)
- Team notifications (task assigned, completed, messages, invites)

### UI/UX
- Full Arabic/RTL support, Dark mode, Mobile hamburger menu
- Landing page (atoms.world aesthetic), smooth scroll, back-to-top
- Markdown bold rendering, Demo walkthrough modal, Voice input

## Code Quality (Completed)
- [x] Removed hardcoded credentials from all test files
- [x] Replaced localStorage with in-memory tokenStore for auth tokens
- [x] FloatingChat switched to sessionStorage (non-sensitive guest data)
- [x] Fixed missing React Hook dependencies (DashboardLayout, Chat, Profile, Team, WhatsApp)
- [x] Fixed empty catch blocks in Team.js
- [x] Replaced index-as-key patterns (Landing, Profile, AdminUsers, AdminBilling, AdminAudit)
- [x] Refactored server.py from 2144 lines to 79-line orchestrator
- [x] Broke circular import email.py ↔ server.py
- [x] Refactored chat.py: split parse_and_create_from_ai (complexity 38) into 8 focused helpers
- [x] Full Arabic/RTL translation on ALL dashboard + admin pages

### Google Calendar Integration (Bidirectional Sync)
- OAuth2 flow: each user connects their own Google Calendar
- Pull events from Google Calendar to local
- Push local events to Google Calendar
- Create events simultaneously in both calendars
- Visual indicators: "Google" badge and "Synced" badge on events
- Auto-refresh of expired tokens, graceful disconnect

### WhatsApp Multi-User Bot System
- Single bot number (Business) serves all subscribers
- Users link their WhatsApp by sending a code (LINK-XXXXXX) to the bot
- Bot verifies user, creates profile, responds with AI
- Smart memory: conversation history (15 msgs), user profile, date awareness
- Voice message support via Whisper transcription (ogg → mp3 → text)
- Rate limiting: Free=10 msgs/day, Pro/Business=500/day (shown as "unlimited")
- Unregistered users get signup prompt
- Admin panel: bot QR connection + usage/cost tracking per user

### Subscription & Pricing (SAR)
- Free: 0 SAR — 10 messages/day, 5 tasks
- Pro: 20 SAR/month — unlimited messages, voice, analytics
- Business: 50 SAR/month — all Pro + WhatsApp + Team + API
- Admin usage dashboard: per-user message counts + estimated costs
- Rate limiting enforced on chat and WhatsApp endpoints

## Production Deployment Infrastructure (Feb 2026)
Designed for Hostinger VPS — Ubuntu 24.04, 16 GB RAM, 4 vCPU.

Files under `/app/`:
- `Dockerfile.backend`, `Dockerfile.frontend`, `Dockerfile.whatsapp`
- `docker-compose.prod.yml` — mongo + redis + backend + frontend + whatsapp + nginx + certbot + uptime-kuma
- `docker-compose.deploy.yml` — CI/CD override (pre-built images from GHCR)
- `nginx/letsm.ai.conf` + `nginx/nginx.conf` + `nginx/frontend.conf` — TLS, reverse proxy, rate limiting, security headers
- `.github/workflows/deploy.yml` — push → build → GHCR → SSH deploy → smoke test
- `scripts/server-setup.sh` — one-shot VPS hardening (UFW, Fail2ban, Docker, SSH, swap, user)
- `scripts/init-letsencrypt.sh` — first-time SSL provisioning
- `scripts/backup.sh` — daily Mongo + WhatsApp auth backup → Backblaze B2 with Telegram alerts
- `scripts/restore.sh` — restore Mongo from B2 backup
- `.env.production.example`, `.env.backup.example` — env templates
- `RUNBOOK.md` — full operational guide (deploy, rollback, DR, troubleshooting, security checklist, cost tracking)
- `DEPLOYMENT.md` — quick-start index

Capacity estimate on the user's box:
- ~7-9 GB RAM used at steady state → ~7 GB headroom
- 200-500 concurrent users; total registered 5K-10K before scaling concerns
- Cost: ~$20-35/month fixed + variable OpenAI usage

## Recent Updates (Feb 2026)
- **WhatsApp Linking by Code** (Jun 6) — New `/dashboard/whatsapp-link` page for end users: generates a one-time `LM-XXXX` code (15min TTL), user sends it to the business WhatsApp number, backend auto-links phone ↔ user account. Anonymous senders get AI replies with a CTA inviting them to register. Linked users get personalised AI responses with conversation history (last 10 turns context). Replaces the Baileys/QR flow. New endpoints: `GET /whatsapp/cloud/link/status`, `POST /whatsapp/cloud/link/code`, `DELETE /whatsapp/cloud/link`.
- **WhatsApp Cloud API LIVE on production** (Jun 6) — Number `+968 7154 7480` (Opps ai) connected via Meta Cloud API with verified webhook. All required META_* env vars configured on VPS. Auto-reply uses OpenAI gpt-4o-mini with bilingual responses.
- **WhatsApp Cloud API admin panel** (Jun 4) — `/admin/whatsapp` page for monitoring + test send + auto-reply toggle.
- **Sentry error monitoring** (Jun 4) — Frontend wraps App in `Sentry.ErrorBoundary`; backend uses `sentry-sdk` with FastAPI integration. Both env-gated.
- **Profile.js refactor** (Jun 4) — Extracted 5 section components (`NotificationsSection`, `EmailDigestSection`, `EmailConfigSection`, `DataExportSection`, `AccountInfoSection`) into `/components/profile/`. Profile.js: 571 → 406 lines (29% reduction). 100% regression-tested.
- **CalendarPage.js refactor** (Jun 4) — Extracted `CalendarEventModal` (~120 lines) into `/components/calendar/`. CalendarPage.js: 491 → 382 lines (22% reduction). 100% regression-tested.
- **SENDER_EMAIL update** (Jun 4) — Changed from `onboarding@resend.dev` (sandbox) to `support@letsm.ai` in `backend/.env`. **User must also update VPS `.env`** after verifying domain in Resend.
- **Audit Logs filters + CSV export** (Jun 3) — Added action dropdown, free-text search (target email / actor / target id), from/to date range, and Clear Filters button on `/admin/audit`. New endpoint `GET /api/admin/audit-logs/export` streams a CSV honouring the same filters.
- **Team Shared Calendar tab** (Jun 3) — New tab in `/dashboard/team` between Reminders and Chat. Monthly grid colour-coded per team member, prev/next/today nav, member filter, click-day-for-detail panel. Backed by `GET /api/teams/calendar`.
- **Landing.js refactor** (Jun 3) — Extracted ~100 lines of static data arrays into `/app/frontend/src/data/landingData.js`. Landing.js: 654 → 552 lines.
- **Admin Audit Logs UI + API** (Jun 3) — `GET /api/admin/audit-logs` (paginated) plus `/admin/audit` page displaying actor, target, action, contextual details (role change → role, subscription change → from→to with cycle/expiry), and timestamp. Arabic + RTL aware headers.
- **Email notification on admin-driven subscription changes** (Jun 3) — When an admin upgrades/downgrades a user via `PUT /api/admin/users/{id}/subscription`, a bilingual (EN/AR) email is dispatched via Resend (`routes/admin_emails.py`).
- **Thawani Pay integration** (Feb 21) — Omani payment gateway for OMR subscriptions. New endpoints `/api/payments/thawani/create-session`, `/verify/{id}`, `/config`. Amount conversion to baisas (×1000). Plans support monthly + yearly billing cycles (yearly = ~17% discount). Stripe UI hidden until later. Auto-downgrade scheduler runs hourly at :05 UTC to revert expired Pro/Business users back to Free.
- **Direct Google OAuth** — Removed Emergent OAuth wrapper. Frontend now uses `@react-oauth/google` `<GoogleLogin />` (credential / ID token flow); backend `/api/auth/google` verifies the ID token with `google-auth` and links/creates users by email. No "Secured by Emergent" badge. *Currently hidden in UI awaiting Google Console origin setup.*
- **Forgot Password / Reset Password flow** — `POST /api/auth/forgot-password` issues a 1-hour single-use token stored in `password_reset_tokens` and emails a reset link via Resend. `POST /api/auth/reset-password` validates the token, updates the hashed password, and invalidates all existing sessions for that user. New pages: `/forgot-password`, `/reset-password`.
- **CI/CD fix** — `docker-compose.deploy.yml` is now copied to the VPS by GitHub Actions (it was previously missing from the SCP source list, which caused the production `compose pull` step to fail on first-time deploys/recreates). Frontend image build now also bakes `REACT_APP_GOOGLE_CLIENT_ID`.

## Backlog
- P2: Add actual video to demo modal
- P2: User verification of Image Analysis + Sample Interactions Gallery + Plus Jakarta Sans font
- P3: Split large React pages (Profile.js, CalendarPage.js) into smaller sub-components
- P3: Implement team calendar view for shared tasks/reminders
- P3: Verify domain `letsm.ai` in Resend dashboard to send from `noreply@letsm.ai` (currently using `onboarding@resend.dev` which works only for the owner's verified email)
