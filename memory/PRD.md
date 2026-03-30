# Letsm AI - Product Requirements Document

## Original Problem Statement
Build an AI assistant SaaS platform with:
- AI-powered conversational assistant using OpenAI GPT-5.2
- Task management assistance
- Reminders & calendar events management
- WhatsApp integration for messaging
- JWT-based authentication (email/password) + Google OAuth social login
- Voice input via Web Speech API
- Productivity statistics dashboard
- Full Arabic language & RTL layout support
- Stripe subscription billing (Free/Pro/Business)
- Professional landing page to sell subscriptions

## Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Framer Motion
- **Backend**: FastAPI (Python) + MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent Integrations
- **Auth**: JWT + Emergent Google OAuth
- **Payments**: Stripe via Emergent Integrations (StripeCheckout)
- **WhatsApp**: Baileys v7 Node.js microservice → FastAPI AI endpoint
- **Design**: Swiss & High-Contrast archetype (Outfit + Manrope fonts)

### Key API Endpoints
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/session`, `/api/auth/me`
- Chat: `/api/chat/message`, `/api/chat/conversations`
- Tasks: `/api/tasks` (CRUD)
- Reminders: `/api/reminders` (CRUD)
- Calendar: `/api/calendar/events` (CRUD)
- Guest Chat: `/api/guest/chat` (no auth, rate limited)
- WhatsApp AI: `/api/whatsapp/ai` (no auth, internal for Node.js service)
- Subscriptions: `/api/subscription/plans`, `/api/subscription/status`, `/api/subscription/checkout`, `/api/subscription/checkout/status/{session_id}`, `/api/webhook/stripe`
- WhatsApp: `/api/whatsapp/status`, `/api/whatsapp/qr`, `/api/whatsapp/connect`, `/api/whatsapp/disconnect`
- Stats: `/api/stats/overview`, `/api/stats/activity`, `/api/stats/streaks`

## What's Been Implemented

### Session 1
- Complete backend API with FastAPI + MongoDB
- JWT authentication with bcrypt + Google OAuth
- AI Chat with GPT-5.2 via Emergent LLM Key
- AI-powered task/reminder creation from natural language
- Push notification system, Voice input (Web Speech API)
- Statistics dashboard, Full Arabic/RTL support
- Basic landing page, WhatsApp Node.js microservice (basic)

### Session 2
- Fixed WhatsApp QR Code (Baileys v7 + fetchLatestBaileysVersion)
- Stripe Subscription Billing (checkout sessions, payment polling, webhooks)
- Profile Subscription UI (upgrade buttons → Stripe checkout)
- SubscriptionSuccess page with payment status polling

### Session 3
- Complete Landing Page Overhaul: Chat Demo, Integrations, Testimonials, Privacy, FAQ, Features
- Full Arabic translation for ALL landing page sections

### Session 4
- **Floating AI Chat Widget**: Landing page visitors can chat with GPT-5.2 without signing up. Rate limited (10 msgs/5 min per IP). Shows sign-up CTA after 3 messages. Supports Arabic.
- **WhatsApp 2-Way AI Chat**: Incoming WhatsApp messages forwarded to GPT-5.2 via `/api/whatsapp/ai` endpoint. AI responses sent back to the user via WhatsApp. Conversations logged to `whatsapp_messages` MongoDB collection. Full Arabic support.

## Prioritized Backlog

### P2 (Nice to Have)
- Add demo video to landing page "Watch Demo" button
- Weekly email digest for productivity stats
- Dark mode theme
- Export data (tasks, reminders)
- Real-time notifications for reminders

## Refactoring Needed
- `server.py` is ~1,700 lines — split into modular FastAPI routers
