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

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Framer Motion + Phosphor Icons
- **Backend**: FastAPI (Python) + MongoDB + APScheduler
- **AI**: OpenAI GPT-5.2 via Emergent Integrations
- **Auth**: JWT + Emergent Google OAuth
- **Payments**: Stripe via Emergent StripeCheckout
- **WhatsApp**: Baileys v7 Node.js → FastAPI AI endpoint
- **Email**: Resend (requires API key to send)
- **Scheduler**: APScheduler (AsyncIOScheduler) for weekly email digests

## All Implemented Features

### Core AI
- GPT-5.2 AI chat with Arabic/English support
- AI-powered task/reminder creation from natural language
- Floating AI chat widget on landing page (guest, rate-limited)
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
- Digest schedule visibility in Profile page

### UI/UX
- Full Arabic/RTL support with language toggle
- Dark mode with theme toggle (localStorage persistence)
- Professional landing page redesigned to match atoms.world aesthetic (Pastel & Soft / Swiss Clean)
  - 9 sections: Hero, Features, Advanced Features, Live Demo, Real Conversations, Integrations, Testimonials, Privacy, Pricing+FAQ, CTA
- Demo walkthrough modal (5-step animated guide)
- Voice input via Web Speech API
- Push notification system

## API Endpoints (Key)
Auth: register, login, session, me, logout
Chat: message, conversations, guest/chat
Tasks/Reminders/Calendar: Full CRUD
Subscriptions: plans, status, checkout, checkout/status, webhook/stripe
WhatsApp: status, qr, connect, disconnect, ai
Stats: overview, activity, streaks
Export: tasks, reminders, conversations, all
Email: preferences (GET/PUT), send-digest, preview-digest, digest-schedule, trigger-digest-batch (admin)
Notifications: list, mark-read, check-reminders

## Backlog
- P2: Add Resend API key to enable live email sending
- P2: Refactor server.py (~1,950 lines) into modular routers
- P2: Team features for Business plan
- P2: CSV export option
- P3: Add actual video to demo modal
