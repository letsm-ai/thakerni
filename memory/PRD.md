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

## Backlog
- P2: Add actual video to demo modal
- P3: Implement team calendar view for shared tasks/reminders
