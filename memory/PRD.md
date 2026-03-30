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
- **WhatsApp**: Baileys v7 Node.js microservice
- **Design**: Swiss & High-Contrast archetype (Outfit + Manrope fonts)

### Key API Endpoints
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/session`, `/api/auth/me`
- Chat: `/api/chat/message`, `/api/chat/conversations`
- Tasks: `/api/tasks` (CRUD)
- Reminders: `/api/reminders` (CRUD)
- Calendar: `/api/calendar/events` (CRUD)
- Subscriptions: `/api/subscription/plans`, `/api/subscription/status`, `/api/subscription/checkout`, `/api/subscription/checkout/status/{session_id}`, `/api/webhook/stripe`
- WhatsApp: `/api/whatsapp/status`, `/api/whatsapp/qr`, `/api/whatsapp/connect`, `/api/whatsapp/disconnect`
- Stats: `/api/stats/overview`, `/api/stats/activity`, `/api/stats/streaks`

## What's Been Implemented

### Session 1
- Complete backend API with FastAPI + MongoDB
- JWT authentication with bcrypt + Google OAuth
- AI Chat with GPT-5.2 via Emergent LLM Key
- AI-powered task/reminder creation from natural language
- Push notification system
- Voice input (Web Speech API)
- Statistics dashboard
- Full Arabic/RTL support
- Basic landing page
- WhatsApp Node.js microservice (basic)

### Session 2
- Fixed WhatsApp QR Code (Baileys v7 + fetchLatestBaileysVersion)
- Stripe Subscription Billing (checkout sessions, payment polling, webhooks)
- Profile Subscription UI (upgrade buttons → Stripe checkout)
- SubscriptionSuccess page with payment status polling

### Session 3
- **Complete Landing Page Overhaul** (ported from reference design):
  - Interactive Chat Demo with 3 clickable scenarios (animated conversations)
  - Integrations showcase (WhatsApp, Telegram, Web Chat, Slack + 4 calendar platforms)
  - Testimonials section (6 user reviews with 5-star ratings)
  - Privacy & Security section (6 feature cards + commitment box + safety guidelines)
  - FAQ accordion (4 questions under pricing)
  - Enhanced Features section (6 feature cards with hover effects)
  - Improved navigation with anchor links (Features/Demo/Pricing/Privacy)
  - Full Arabic translation for ALL new sections

## Prioritized Backlog

### P1 (High Priority)
- Complete WhatsApp 2-way chat forwarding to AI backend
- Add real-time notifications for reminders

### P2 (Nice to Have)
- Add demo video to landing page "Watch Demo" button
- Weekly email digest for productivity stats
- Dark mode theme
- Export data (tasks, reminders)

## Refactoring Needed
- `server.py` is ~1,600 lines — split into modular FastAPI routers
