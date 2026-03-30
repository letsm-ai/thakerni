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
- **Design**: Swiss & High-Contrast archetype with Dark Mode support

### Key API Endpoints
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/session`, `/api/auth/me`
- Chat: `/api/chat/message`, `/api/chat/conversations`
- Tasks: `/api/tasks` (CRUD)
- Reminders: `/api/reminders` (CRUD)
- Calendar: `/api/calendar/events` (CRUD)
- Guest Chat: `/api/guest/chat` (no auth, rate limited)
- WhatsApp AI: `/api/whatsapp/ai` (internal for Node.js service)
- Export: `/api/export/tasks`, `/api/export/reminders`, `/api/export/conversations`, `/api/export/all`
- Subscriptions: `/api/subscription/plans`, `/api/subscription/status`, `/api/subscription/checkout`
- WhatsApp: `/api/whatsapp/status`, `/api/whatsapp/qr`, `/api/whatsapp/connect`, `/api/whatsapp/disconnect`
- Stats: `/api/stats/overview`, `/api/stats/activity`, `/api/stats/streaks`

## What's Been Implemented

### Session 1 (Initial Build)
- Complete FastAPI + MongoDB backend
- JWT auth + Emergent Google OAuth
- GPT-5.2 AI Chat with Arabic support
- AI-powered task/reminder creation from natural language
- Voice input (Web Speech API), Statistics dashboard
- Full Arabic/RTL support, Basic landing page
- WhatsApp Node.js microservice (basic)

### Session 2 (Payments + WhatsApp Fix)
- Fixed WhatsApp QR Code (Baileys v7 + fetchLatestBaileysVersion)
- Stripe Subscription Billing (checkout, webhooks, payment polling)
- Profile Subscription UI + SubscriptionSuccess page

### Session 3 (Landing Page Overhaul)
- Interactive Chat Demo (3 animated conversation scenarios)
- Integrations showcase (messaging + calendar platforms)
- Testimonials (6 user reviews with star ratings)
- Privacy & Security section with safety guidelines
- FAQ accordion under pricing
- Enhanced Features section (6 cards)

### Session 4 (AI Chat Widget + WhatsApp AI)
- Floating AI chat widget on landing page (GPT-5.2, rate limited, Arabic support)
- WhatsApp 2-way AI forwarding (messages → GPT-5.2 → reply back)
- WhatsApp conversation logging to MongoDB

### Session 5 (Polish & Features)
- **localStorage persistence** for floating chat widget (24h expiry, clear button)
- **Dark mode** with ThemeContext, sidebar toggle, CSS overrides, localStorage persistence
- **Data export** — 4 endpoints (tasks, reminders, conversations, all) as JSON download
- **Browser notifications** for reminders (native Notification API with permission flow)
- **Demo walkthrough modal** — 5-step animated walkthrough (Chat, Tasks, Voice, WhatsApp, Stats)

## Prioritized Backlog

### P2 (Nice to Have)
- Weekly email digest for productivity stats (needs email service integration)
- Refactor `server.py` (~1,800 lines) into modular FastAPI routers
- Add actual video content to demo modal
- Team features for Business plan
