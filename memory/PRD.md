# Letsm AI - Product Requirements Document

## Original Problem Statement
Build an AI assistant SaaS platform with:
- AI-powered conversational assistant using OpenAI GPT-5.2
- Task management assistance
- Reminders & calendar events management
- WhatsApp integration for messaging
- JWT-based authentication (email/password) + Google OAuth social login
- Professional and user-friendly design

## Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent Integrations
- **Auth**: JWT + Emergent Google OAuth
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
- `GET /api/whatsapp/status` - WhatsApp connection status
- `GET /api/whatsapp/qr` - Get WhatsApp QR code

## User Personas
1. **Productivity User**: Uses AI chat for task planning, creates tasks and reminders
2. **Business User**: Connects WhatsApp for customer communication
3. **Personal User**: Uses calendar and reminders for scheduling

## Core Requirements (Static)
- [x] User authentication (JWT + Google OAuth)
- [x] AI conversational assistant (GPT-5.2)
- [x] Task management (CRUD)
- [x] Reminders management (CRUD)
- [x] Calendar events (CRUD)
- [x] WhatsApp integration placeholder
- [x] User profile management
- [x] Responsive sidebar navigation

## What's Been Implemented (2026-03-30)
- ✅ Complete backend API with FastAPI
- ✅ MongoDB integration for all data
- ✅ JWT authentication with bcrypt password hashing
- ✅ Google OAuth via Emergent Auth
- ✅ AI Chat with OpenAI GPT-5.2
- ✅ **AI-powered task/reminder creation from natural language**
  - Say "Create task: call dentist tomorrow" → automatically creates task
  - Say "Remind me to pick up package at 3pm" → automatically creates reminder
- ✅ **AI task management via chat** (NEW!)
  - "Show my tasks" → lists all pending tasks with priorities
  - "Complete task 1" → marks task #1 as done
  - "Show my reminders" → lists upcoming reminders
  - "Cancel reminder 1" → deletes reminder #1
- ✅ **Push Notifications System** (NEW!)
  - Notification bell with unread count badge
  - Auto-check for due reminders every minute
  - Task due date notifications
  - Mark as read, mark all read, delete notifications
- ✅ **WhatsApp Node.js Microservice** (NEW!)
  - Express server with Baileys WhatsApp library
  - QR code authentication
  - Commands: create task, list tasks, complete task, set reminder
  - Ready to deploy at /app/whatsapp-service
- ✅ **Voice Input** (NEW!)
  - Microphone button in chat input area
  - Web Speech API integration (Chrome, Edge, Safari supported)
  - Real-time speech-to-text transcription
  - Voice commands: "Create task...", "Show my tasks", "Remind me..."
- ✅ Tasks CRUD with priority and due dates
- ✅ Reminders CRUD with repeat options
- ✅ Calendar events CRUD
- ✅ Professional Swiss-style UI design
- ✅ All pages: Login, Dashboard, Chat, Tasks, Reminders, Calendar, WhatsApp, Profile

## Prioritized Backlog

### P0 (Critical)
- None remaining for MVP

### P1 (High Priority)
- WhatsApp Node.js microservice deployment
- Real-time notifications for reminders
- Task due date notifications

### P2 (Nice to Have)
- AI-powered task suggestions
- ~~Voice input for AI chat~~ ✅ DONE
- Dark mode theme
- Export data (tasks, reminders)
- Team collaboration features

## Next Tasks
1. Deploy WhatsApp Node.js service (run `cd /app/whatsapp-service && yarn start`)
2. Add browser push notifications (Web Push API)
3. Implement task completion statistics
4. Add AI conversation export feature
