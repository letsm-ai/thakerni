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
- WhatsApp 2-way AI chat forwarding
- Live Demo chat on landing page (real AI responses, not just scripted)

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

### Admin Dashboard (Role-Based Access Control)
- **Roles**: admin (full access), developer (users/analytics/system/audit), operations (users/subscriptions/billing/analytics), viewer (users/subscriptions/analytics)
- **Overview**: Stat cards (users, tasks, conversations, reminders, revenue), subscription breakdown chart, 14-day signup trend chart
- **User Management**: Paginated user table with search, plan filters (All/Free/Pro/Business), user detail side panel with role selector (5 roles), suspend/activate toggle, activity stats, payment history
- **Analytics**: Signup trend area chart, daily activity bar chart (messages + tasks), country distribution pie chart, period summary stats, day range filter (7d/14d/30d)
- **Billing**: Revenue cards (30-day revenue, transaction count, avg transaction), revenue bar chart, payment history table with status filters
- **System Health**: Service status badges (OpenAI, Stripe, Resend, WhatsApp), WhatsApp connection details, database collection counts, email digest run history
- **Audit Logs**: Timestamped log of admin actions (role changes, suspensions)
- **IP Geolocation**: User country/city captured on login/signup via ip-api.com

### UI/UX
- Full Arabic/RTL support with language toggle (`dir="auto"` on all chat bubbles)
- Dark mode with theme toggle (localStorage persistence)
- Professional landing page redesigned to match atoms.world aesthetic
- Mobile-responsive hamburger menu
- Smooth scroll-to-section navigation
- Back-to-top sticky button
- Markdown bold text rendering in chat bubbles
- Demo walkthrough modal
- Voice input via Web Speech API

## Backlog
- P2: Add Resend API key to enable live email sending
- P2: Refactor server.py (~2,000 lines) into modular routers
- P2: Team features for Business plan
- P2: CSV export option
- P3: Add actual video to demo modal
