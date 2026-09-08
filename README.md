# 📱 TaskSend — Enterprise WhatsApp-Based Employee Task Management System

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Meta WhatsApp API](https://img.shields.io/badge/Meta_WhatsApp_Cloud_API-v20.0-25D366?style=for-the-badge&logo=whatsapp)](https://developers.facebook.com/docs/whatsapp/cloud-api)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-LLaMA_3.3_70B-f05032?style=for-the-badge)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

A lightweight, enterprise-grade task management ecosystem that operates directly through **WhatsApp** using the **Meta WhatsApp Business Cloud API**. Managers assign tasks via a modern web dashboard or voice/text commands on WhatsApp. Employees receive instant interactive WhatsApp notifications and reply with one tap — requiring **zero app installation**.

---

## 🎯 The Problem & Core Concept

Traditional task management platforms force frontline workers to download separate apps, learn complex dashboards, and constantly check notifications. 

**TaskSend** leverages WhatsApp — the platform frontline employees already use daily:
* **For Employers:** Assign tasks individually or in bulk, attach deadlines, priority levels, notes, and clients via a Web Dashboard or by sending simple WhatsApp voice/text messages.
* **For Employees:** Receive rich WhatsApp notifications with interactive **Quick Reply Buttons** (`✅ DONE`, `⏳ IN PROGRESS`, `❌ CANNOT COMPLETE`). Tapping a button automatically updates the manager's live dashboard in real time.

---

## 🏗️ System Architecture

```text
 ┌──────────────────────────────────────────────────────────┐
 │                    EMPLOYER INTERFACE                     │
 ├────────────────────────────┬─────────────────────────────┤
 │   Next.js 16 Dashboard     │  WhatsApp Employer Chat     │
 └─────────────┬──────────────┴──────────────┬──────────────┘
               │                             │
               ▼                             ▼
 ┌───────────────────────────┐ ┌────────────────────────────┐
 │  Groq AI (LLaMA 3.3 70B)  │ │   Meta Cloud API Webhook   │
 │  Natural Language Parsing │ │   (GET / POST Handler)     │
 └─────────────┬─────────────┘ └─────────────┬──────────────┘
               │                             │
               ▼                             ▼
 ┌──────────────────────────────────────────────────────────┐
 │             Supabase PostgreSQL Database                 │
 │      (Multi-Tenant RLS Security & Realtime Data)         │
 └────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
 ┌──────────────────────────────────────────────────────────┐
 │         Meta WhatsApp Business Cloud API v20.0           │
 │       (Template Messages & Interactive Buttons)          │
 └────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
 ┌──────────────────────────────────────────────────────────┐
 │                    EMPLOYEE PHONE                        │
 │     Receives task card -> Taps Quick Reply Button        │
 └──────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

* 🚀 **Meta WhatsApp Business Cloud API v20.0 Integration**: Built-in template dispatcher, fallback interactive buttons, and standard text messaging.
* 🤖 **AI Natural Language Task Extraction**: Powered by Groq (LLaMA 3.3 70B). Speak or type *"Tell Sona to clean office by 5pm high priority"* and the system automatically resolves employee, deadline, priority, and task details.
* ⚡ **WhatsApp Command Hub for Managers**: Employers can assign tasks directly inside WhatsApp chat without opening the web app.
* 🔘 **One-Tap Quick Reply Buttons**: Employees reply using native WhatsApp interactive buttons for status transitions (`completed`, `in_progress`, `cannot_complete`).
* 📊 **Real-Time Analytics & Monitoring Dashboard**: Track total tasks, completion rates, active employees, clients, categories, and calendar views.
* 🔒 **Multi-Tenant Row Level Security (RLS)**: Enforced via Supabase authentication tokens so user data remains private and secure.

---

## 🛠️ WhatsApp API Integration Details

The project includes a dedicated, production-ready WhatsApp service layer located at [`src/lib/whatsapp.ts`](file:///D:/DESKTOP/whatsapp-task-system/src/lib/whatsapp.ts):

* **`sendTaskAssignmentWhatsApp(payload)`**: Smart dispatcher that sends approved Meta WhatsApp templates with quick reply payloads (`DONE_<shortId>`, `PROGRESS_<shortId>`, `CANNOT_<shortId>`), automatically falling back to interactive or formatted text messages if templates are pending approval.
* **`sendMetaTextMessage(toPhone, bodyText)`**: Directly sends Graph API v20.0 text messages.
* **`sendMetaInteractiveButtons(toPhone, bodyText, buttons)`**: Sends interactive quick reply buttons directly.
* **`formatMetaPhoneNumber(phone)`**: Sanitizes international phone numbers into E.164 compliant digit strings required by Meta.

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher
* **Supabase Account**: For PostgreSQL database & authentication
* **Meta Developer Account**: For WhatsApp Business Cloud API access
* **Groq API Key**: Free tier access to `llama-3.3-70b-versatile`

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/whatsapp-task-system.git
cd whatsapp-task-system
npm install
```

### 3. Database Setup (Supabase)
1. Open your project in the [Supabase Dashboard](https://supabase.com).
2. Go to the **SQL Editor**.
3. Copy the contents of [`schema.sql`](file:///D:/DESKTOP/whatsapp-task-system/schema.sql) and execute the query. This creates all tables (`employees`, `tasks`, `clients`, `categories`, `teams`, `activity_logs`), sets up indexes, and configures Row Level Security (RLS).

### 4. Configure Environment Variables
Copy `.env.example` to `.env.local` and populate your credentials:

```bash
cp .env.example .env.local
```

Key environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

META_PHONE_NUMBER_ID=1167839569739966
META_WHATSAPP_TOKEN=your_permanent_meta_access_token
META_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token

EMPLOYER_WHATSAPP=+917025423667
GROQ_API_KEY=gsk_your_groq_api_key
```

### 5. Meta WhatsApp Business Cloud API Configuration

#### A. Set up Meta WhatsApp Product
1. Go to [Meta Developers Console](https://developers.facebook.com) and create a **Business App**.
2. Add the **WhatsApp** product to your app.
3. Under **WhatsApp -> API Setup**, obtain your `Phone Number ID` and a temporary or permanent System User `Access Token`.

#### B. Configure Meta Message Template (Optional for Quick Replies)
1. In Meta WhatsApp Manager, navigate to **Message Templates** and create a template named `task_assigned_v2`.
2. Category: `Utility`, Language: `English (en)`.
3. Body parameters:
   * `{{1}}`: Task ID (e.g. `A1B2C3`)
   * `{{2}}`: Task Title (e.g. `Clean office`)
   * `{{3}}`: Priority (e.g. `High`)
   * `{{4}}`: Deadline (e.g. `5:00 PM`)
4. Buttons: Add 3 **Quick Reply** buttons (`DONE`, `PROGRESS`, `CANNOT`).

#### C. Configure Webhook Endpoint
1. Deploy your app to Vercel or expose local port using ngrok (`ngrok http 3000`).
2. Set Webhook URL to `https://your-domain.com/api/webhook`.
3. Set Verify Token to match `META_WEBHOOK_VERIFY_TOKEN` in `.env.local`.
4. Subscribe to the `messages` webhook field.

### 6. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/create-task` | Creates task & sends WhatsApp message to employee | Yes (Bearer Token) |
| `GET` | `/api/tasks` | Fetches tasks assigned by current authenticated user | Yes (Bearer Token) |
| `GET` | `/api/employees` | Fetches saved employees list | Yes (Bearer Token) |
| `POST` | `/api/employees` | Adds a new employee | Yes (Bearer Token) |
| `POST` | `/api/parse-task` | Uses Groq LLaMA 3.3 to extract task details from text | No |
| `GET` | `/api/webhook` | Meta Webhook verification handshake | Meta Verification |
| `POST` | `/api/webhook` | Meta Webhook event listener for employee button taps & text replies | Meta Signature |
| `POST` | `/api/send-whatsapp` | API diagnostic tool for testing Meta WhatsApp dispatch | Optional |

---

## 📁 Directory Structure

```text
whatsapp-task-system/
├── schema.sql                      # Complete Supabase PostgreSQL database schema & RLS policies
├── .env.example                    # Environment variables template
├── package.json                    # Dependencies and scripts
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # Serverless API Endpoints
│   │   │   ├── create-task/        # Task creation & WhatsApp dispatch endpoint
│   │   │   ├── employees/          # Employee management endpoint
│   │   │   ├── parse-task/         # Groq AI natural language parser
│   │   │   ├── send-whatsapp/      # WhatsApp API test diagnostic endpoint
│   │   │   ├── tasks/              # Task list retrieval endpoint
│   │   │   └── webhook/            # Meta WhatsApp Webhook event receiver
│   │   ├── bulk/                   # Bulk task creation page
│   │   ├── calendar/               # Task calendar view
│   │   ├── categories/             # Task category manager
│   │   ├── clients/                # Client list manager
│   │   ├── dashboard/              # Manager analytics & stats dashboard
│   │   ├── login/                  # Supabase authentication page
│   │   ├── page.tsx                # Main Task Assigner UI
│   │   ├── layout.tsx              # App root layout
│   │   └── globals.css             # TailwindCSS v4 styles & glassmorphism
│   ├── components/
│   │   └── Layout.tsx              # Responsive navigation bar & layout wrapper
│   └── lib/
│       ├── supabase.ts             # Supabase client initializer
│       └── whatsapp.ts             # Modular Meta WhatsApp Cloud API service
└── README.md                       # Project documentation
```

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](file:///D:/DESKTOP/whatsapp-task-system/LICENSE) for details.
