# Letsm AI - Product Requirements Document

## Original Problem Statement
Build an AI assistant SaaS platform with:
- AI-powered conversational assistant using OpenAI GPT-5.2
- Task management, Reminders & calendar events
- WhatsApp integration for messaging
- JWT + Google OAuth authentication
- Voice input via Web Speech API
- Productivity statistics dashboard
- Full Arabic language & RTL layout support
- Stripe subscription billing (Free/Pro/Business)
- Professional landing page to sell subscriptions
- Admin Dashboard with role-based access control
- Team features for Business plan

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + Phosphor Icons + Recharts
- **Backend**: FastAPI (Python) + MongoDB + APScheduler
- **AI**: OpenAI GPT-5.2 via Emergent Integrations
- **Auth**: JWT + Emergent Google OAuth
- **Payments**: Stripe via Emergent StripeCheckout
- **WhatsApp**: Baileys v7 Node.js -> FastAPI AI endpoint
- **Email**: Resend (requires API key to send)
- **Scheduler**: APScheduler (AsyncIOScheduler) for weekly email digests
- **Geolocation**: ip-api.com for user country/city tracking

## All Implemented Features

### Core AI
- GPT-5.2 AI chat with Arabic/English support
- AI-powered task/reminder creation from natural language
- Floating AI chat widget on landing page (guest, rate-limited)
- Live Demo chat on landing page (real AI responses)
- WhatsApp 2-way AI chat forwarding

### Productivity
- Tasks CRUD with priority levels
- Reminders CRUD with scheduling
- Calendar events CRUD
- Productivity statistics dashboard with streaks
- Data export (Tasks/Reminders/Conversations/All as JSON)

### Auth & Billing
- JWT authentication (email/password)
- Emergent Google OAuth social login
- Stripe subscription billing (Free/Pro/Business tiers)
- Checkout sessions, payment polling, webhooks

### Communication
- WhatsApp QR scan + 2-way AI messaging (Baileys v7)
- Browser notifications for reminders (native API)
- Weekly email digest with automated CRON scheduling (every Sunday 09:00 UTC)
- Email preferences (opt-in/out toggles)

### Admin Dashboard (Role-Based Access Control)
- **Roles**: admin (full access), developer (users/analytics/system/audit), operations (users/subscriptions/billing/analytics), viewer (users/subscriptions/analytics)
- **Pages**: Overview, User Management, Analytics (charts), Billing, System Health, Audit Logs
- IP Geolocation capture on login/signup

### Team Features (Business Plan)
- **Team Management**: Create team (business plan only), invite members by email, roles (owner/admin/member), remove members, role changes (owner only), leave team
- **Shared Tasks**: Create/assign/complete/delete team tasks, priority levels, assignee selector, creator attribution
- **Shared Reminders**: Create team-wide reminders with datetime, creator attribution, deactivate
- **Team Chat**: Real-time team messaging, user attribution, auto-scroll, polling refresh
- **Team Analytics**: Stat cards (tasks/completed/reminders/messages), per-member activity table, billing info ($10/seat/mo)
- **Access Control**: Business plan check, non-member 403s, role-based permissions

### UI/UX
- Full Arabic/RTL support with language toggle
- Dark mode with theme toggle
- Landing page (atoms.world aesthetic) with mobile hamburger menu
- Smooth scroll navigation + back-to-top button
- Markdown bold rendering in chat bubbles
- Demo walkthrough modal, Voice input

## Key Database Collections
- users, tasks, reminders, conversations, messages, payment_transactions
- teams, team_members, team_tasks, team_reminders, team_conversations, team_messages
- audit_logs, digest_logs

## Backlog
- P2: Add Resend API key to enable live email sending
- P2: Refactor server.py (~2,000 lines) into modular routers
- P2: CSV export option
- P3: Add actual video to demo modal
