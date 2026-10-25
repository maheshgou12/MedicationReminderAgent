# 💊 Medication Reminder Agent

A full-stack medication management and reminder system that helps users schedule medicines, receive automated email reminders, track medication adherence, and get AI-powered insights.

## ✨ Features

- 🔐 JWT authentication + rotating refresh tokens
- 👤 Profile management, password change & email password-reset
- 💊 Add, edit, and delete medications
- 🕐 Smart scheduling: multiple dose times per day + weekday selection
- 📦 Refill tracking with low-stock alerts
- ⏰ Automated medication reminders (multi-dose, weekday-aware)
- 📧 Email notifications + optional webhook (Slack/Discord/SMS gateway)
- 🔔 In-app notification center with missed-dose escalation
- ✅ Mark medication as taken (auto-decrements stock)
- ❌ Track missed medications
- 📊 Adherence analytics, trend charts, consistency heatmap, CSV export
- 🤖 AI insights, chat assistant, drug-interaction checker
  (built-in logic; plug in OpenAI/Gemini via API key for LLM answers)
- 🔄 Activate / deactivate medications
- 🗄️ PostgreSQL (local SQLite fallback)
- ⚡ Background scheduling with APScheduler
- 🖥️ Modern React dashboard with dark mode
- 📱 Installable PWA + 🔍 search/filter/sort

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- React Router
- CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- APScheduler
- JWT
- Passlib / bcrypt

### Database
- PostgreSQL

### Notifications
- SMTP / Gmail

## 🏗️ Architecture

```text
React Frontend
      │
      ▼
FastAPI Backend
      │
 ┌────┴─────┐
 ▼          ▼
PostgreSQL  APScheduler
               │
               ▼
          Email Reminder
```

## 🚀 Quickstart

```bash
# 1. Backend
cp .env.example .env        # fill SECRET_KEY, DATABASE_URL, SMTP_*
pip install -r requirements.txt
uvicorn main:app --reload   # http://127.0.0.1:8000 (docs: /docs)

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env        # VITE_API_URL=http://127.0.0.1:8000
npm install
npm run dev                 # http://localhost:5173

# 3. Optional Streamlit client
streamlit run app.py
```

Notes:
- Without `DATABASE_URL`, backend uses local sqlite `./medication.db`.
- Without SMTP settings, reminders are logged and email is skipped.
- Set `OPENAI_API_KEY` (or `GEMINI_API_KEY`) for LLM-powered AI
  answers; otherwise built-in local logic is used.
- Set `NOTIFICATION_WEBHOOK_URL` to mirror reminders to
  Slack/Discord/an SMS gateway (POSTs `{"text": ...}`).
- Register via UI (`/register`) or `POST /register` with JSON
  `{"username","email","password"}` (min 6 chars).
- `reminder_time` / `dose_times` must be `HH:MM` 24h; `weekdays` is
  `[0-6]` (Mon-Sun, empty = every day); toggle status via
  `PATCH /medications/{id}/status?active=true` (JSON body also accepted).
- Key API groups: `/refresh`, `/logout`, `/profile`, `/password-reset/*`,
  `/notifications/*`, `/medications/{id}/refill`, `/analytics/trend`,
  `/logs/export`, `/ai/chat`, `/ai/interactions`.

## ✅ Verification

```bash
# Backend test suite
.venv/Scripts/python -m pytest tests/ -v   # all passing

# Frontend
cd frontend && npm run lint && npm run build   # both clean
```
