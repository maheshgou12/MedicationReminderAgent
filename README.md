# 💊 Medication Reminder Agent

A full-stack medication management and reminder system that helps users schedule medicines, receive automated email reminders, track medication adherence, and get AI-powered insights.

## ✨ Features

- 🔐 JWT-based authentication
- 💊 Add, edit, and delete medications
- ⏰ Automated medication reminders
- 📧 Email notifications using SMTP
- ✅ Mark medication as taken
- ❌ Track missed medications
- 📊 Medication adherence analytics
- 🤖 AI-powered medication insights
- 🔄 Activate / deactivate medications
- 🗄️ PostgreSQL database
- ⚡ Background scheduling with APScheduler
- 🖥️ Modern React dashboard

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




