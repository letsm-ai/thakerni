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
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent Integrations
- **Auth**: JWT + Emergent Google OAuth
- **Payments**: Stripe via Emergent Integrations (StripeCheckout)
- **WhatsApp**: Baileys v7 Node.js microservice
- **Design**: Swiss & High-Contrast archetype (Outfit + Manrope fonts)

### API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (JWT)
- `POST /api/auth/session` - Google OAuth session exchange
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `POST /api/chat/message` - Send message to AI
- `GET /api/chat/conversations` - List conversations
- `GET /api/chat/conversations/{id}/messages` - Get conversation messages
- `DELETE /api/chat/conversations/{id}` - Delete conversation
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List tasks
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `POST /api/reminders` - Create reminder
- `GET /api/reminders` - List reminders
- `DELETE /api/reminders/{id}` - Delete reminder
- `POST /api/calendar/events` - Create event
- `GET /api/calendar/events` - List events
- `DELETE /api/calendar/events/{id}` - Delete event
- `GET /api/subscription/plans` - List subscription plans
- `GET /api/subscription/status` - Get user subscription status
- `POST /api/subscription/checkout` - Create Stripe checkout session
- `GET /api/subscription/checkout/status/{session_id}` - Poll payment status
- `POST /api/webhook/stripe` - Stripe webhook handler
- `GET /api/whatsapp/status` - WhatsApp connection status
- `GET /api/whatsapp/qr` - Get WhatsApp QR code
- `POST /api/whatsapp/connect` - Trigger new WhatsApp QR generation
- `POST /api/whatsapp/disconnect` - Disconnect WhatsApp
- `GET /api/stats/overview` - Productivity stats
- `GET /api/stats/activity` - Activity chart data
- `GET /api/stats/streaks` - Streak data

## What's Been Implemented

### Session 1 (2026-03-30)
- Complete backend API with FastAPI + MongoDB
- JWT authentication with bcrypt + Google OAuth
- AI Chat with GPT-5.2 via Emergent LLM Key
- AI-powered task/reminder creation from natural language
- Push notification system
- Voice input (Web Speech API)
- Statistics dashboard
- Full Arabic/RTL support
- Professional landing page with pricing
- WhatsApp Node.js microservice (basic)

### Session 2 (2026-03-30)
- **Fixed WhatsApp QR Code**: Updated Baileys to v7, used `fetchLatestBaileysVersion()`, added `/connect` endpoint for on-demand QR regeneration, frontend auto-polls every 3s
- **Stripe Subscription Billing**: Implemented full checkout flow using Emergent StripeCheckout - plans API, checkout session creation (server-side pricing), payment status polling, webhook handler, `payment_transactions` collection
- **Profile Subscription UI**: Added subscription section showing current plan, upgrade buttons for Pro/Business that redirect to Stripe checkout
- **SubscriptionSuccess Page**: Payment status polling page at `/dashboard/subscription/success`

## Prioritized Backlog

### P1 (High Priority)
- Complete WhatsApp 2-way chat forwarding to AI backend
- Add real-time notifications for reminders

### P2 (Nice to Have)
- Add demo video to landing page "Watch Demo" button
- Add testimonials section to landing page
- Weekly email digest for productivity stats
- Dark mode theme
- Export data (tasks, reminders)

## Refactoring Needed
- `server.py` is ~1,600 lines - split into modular FastAPI routers (auth, tasks, ai, whatsapp, billing)
