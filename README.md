# TaskSend — Enterprise WhatsApp Task Management System

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://whatsapp-task-system.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Meta WhatsApp API](https://img.shields.io/badge/Meta_WhatsApp_Cloud_API-v20.0-25D366?style=for-the-badge&logo=whatsapp)](https://developers.facebook.com/docs/whatsapp/cloud-api)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-LLaMA_3.3_70B-f05032?style=for-the-badge)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

TaskSend is an enterprise-grade task management ecosystem that operates directly through **WhatsApp** using the **Meta WhatsApp Business Cloud API**. Managers assign tasks via a web dashboard or voice/text commands on WhatsApp. Employees receive interactive WhatsApp notifications and update status with a single tap, requiring no additional mobile application installations.

* **Live Demo:** [https://whatsapp-task-system.vercel.app/](https://whatsapp-task-system.vercel.app/)

---

## System Overview & Architecture

Traditional task management platforms require frontline employees to install dedicated mobile applications and monitor complex dashboards. TaskSend integrates into existing WhatsApp workflows:

* **For Managers:** Assign individual or bulk tasks with attached deadlines, priority levels, notes, and clients via the Web Dashboard or WhatsApp chat commands.
* **For Employees:** Receive structured WhatsApp task notifications with native Quick Reply Buttons (`DONE`, `IN PROGRESS`, `CANNOT COMPLETE`). Tapping a button automatically updates task status on the manager's live dashboard in real time.

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

## Key Features

* **Meta WhatsApp Business Cloud API Integration:** Pre-built template dispatcher, fallback interactive buttons, and text messaging layer via Graph API v20.0.
* **AI Natural Language Task Extraction:** Integrated with Groq LLaMA 3.3 70B model to extract employee name, task description, priority, and deadline from natural language inputs.
* **WhatsApp Manager Command Hub:** Enables managers to assign tasks directly through WhatsApp chat commands without opening the web dashboard.
* **Interactive Quick Reply Buttons:** Direct status updates using native WhatsApp buttons (`completed`, `in_progress`, `cannot_complete`).
* **Real-Time Analytics Dashboard:** Metrics tracking total tasks, completion rates, employee activity, client assignments, categories, and calendar views.
* **Multi-Tenant Row Level Security (RLS):** Database policy enforcement via Supabase Auth ensuring isolated multi-tenant data access.

---

## WhatsApp API Integration Details

The project includes a dedicated service module located at [`src/lib/whatsapp.ts`](file:///D:/DESKTOP/whatsapp-task-system/src/lib/whatsapp.ts):

* **`sendTaskAssignmentWhatsApp(payload)`:** Dispatcher that transmits approved Meta WhatsApp templates with quick reply payloads (`DONE_<shortId>`, `PROGRESS_<shortId>`, `CANNOT_<shortId>`), with automatic fallback to interactive text messages.
* **`sendMetaTextMessage(toPhone, bodyText)`:** Handles Graph API v20.0 text message transmission.
* **`sendMetaInteractiveButtons(toPhone, bodyText, buttons)`:** Transmits interactive quick reply button structures.
* **`formatMetaPhoneNumber(phone)`:** Sanitizes phone numbers into E.164 compliant format required by Meta.

> [!IMPORTANT]
> **DEVELOPMENT VS. PRODUCTION RECIPIENT DISCLAIMER:**
> * **Meta Sandbox / Test Mode (Development):** Meta restricts test accounts to pre-verified numbers. You **MUST** manually add any recipient phone number in the [Meta Developers Portal](https://developers.facebook.com/) under **WhatsApp -> API Setup -> To phone number -> Add phone number** (and verify via OTP) before messages can be delivered to that typed number.
> * **Production Mode:** Once a verified Meta Business phone number is connected in Meta Business Manager, the system can deliver WhatsApp messages to **ANY typed phone number globally** without recipient pre-registration.

---

## Installation & Setup Guide

### 1. Prerequisites
* **Node.js:** v18.0.0 or higher
* **Supabase Account:** PostgreSQL database and authentication provider
* **Meta Developer Account:** Meta WhatsApp Business Cloud API access
* **Groq API Key:** Access to `llama-3.3-70b-versatile` model

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/sonaodupara/whatsapp-task-system.git
cd whatsapp-task-system
npm install
```

### 3. Database Setup (Supabase)
1. Navigate to the SQL Editor in your Supabase Dashboard.
2. Execute the queries in [`schema.sql`](file:///D:/DESKTOP/whatsapp-task-system/schema.sql). This initializes tables (`employees`, `tasks`, `clients`, `categories`, `teams`, `activity_logs`), performance indexes, and Row Level Security (RLS) policies.

### 4. Configure Environment Variables
Copy `.env.example` to `.env.local` and set required configuration keys:

```bash
cp .env.example .env.local
```

Example `.env.local` structure:
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
1. Register a **Business App** in the [Meta Developers Console](https://developers.facebook.com/).
2. Add the **WhatsApp** product.
3. Retrieve your `Phone Number ID` and System User `Access Token` under **WhatsApp -> API Setup**.

> [!WARNING]
> **DEVELOPMENT REQUIREMENT:** In Meta Developer Sandbox mode, recipient phone numbers **MUST** be manually verified under **WhatsApp -> API Setup -> To phone number -> Add phone number**. In Production mode with a verified business phone number, messages are sent to any typed number globally.

#### B. Configure Message Template (Optional for Quick Replies)
1. In Meta WhatsApp Manager, create a template named `task_assigned_v2`.
2. Category: `Utility`, Language: `English (en)`.
3. Body variables: `{{1}}` (Task ID), `{{2}}` (Title), `{{3}}` (Priority), `{{4}}` (Deadline).
4. Buttons: Add 3 Quick Reply buttons (`DONE`, `PROGRESS`, `CANNOT`).

#### C. Configure Webhook Endpoint
1. Deploy the application to Vercel or expose port 3000 using ngrok (`ngrok http 3000`).
2. Set Webhook URL to `https://whatsapp-task-system.vercel.app/api/webhook` (or your domain).
3. Set Verify Token to match `META_WEBHOOK_VERIFY_TOKEN`.
4. Subscribe to the `messages` event field.

### 6. Run Development Server
```bash
npm run dev
```
Access the dashboard at [http://localhost:3000](http://localhost:3000).

---

## API Endpoints Reference

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

## Project Structure

```text
whatsapp-task-system/
├── schema.sql                      # Supabase PostgreSQL database schema & RLS policies
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
│   │   └── globals.css             # TailwindCSS v4 styles & glassmorphic themes
│   ├── components/
│   │   └── Layout.tsx              # Responsive navigation bar & layout wrapper
│   └── lib/
│       ├── supabase.ts             # Supabase client initializer
│       └── whatsapp.ts             # Modular Meta WhatsApp Cloud API service
└── README.md                       # Project documentation
```

---

## License

Distributed under the MIT License. See [`LICENSE`](file:///D:/DESKTOP/whatsapp-task-system/LICENSE) for details.
