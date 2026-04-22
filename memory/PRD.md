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
- **Auth**: JWT + Emergent Google OAuth
- **Payments**: Stripe via Emergent StripeCheckout
- **WhatsApp**: Baileys v7 Node.js -> FastAPI AI endpoint
- **Email**: Resend (configurable via Profile > Email Config)
- **Scheduler**: APScheduler for weekly email digests (Sunday 09:00 UTC)

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

## Backlog
- P2: Refactor server.py (~2,100 lines) into modular routers
- P3: Add actual video to demo modal
