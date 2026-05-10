<div align="center">

# 🚀 JobPair AI

### AI-powered career acceleration platform — analyze resumes, generate roadmaps, craft cover letters, and ace mock interviews.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-Flash-4285F4?logo=google)](https://ai.google.dev/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk)](https://clerk.com/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791?logo=postgresql)](https://www.postgresql.org/)
[![ImageKit](https://img.shields.io/badge/CDN-ImageKit-FF6B35)](https://imagekit.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)

---

## 🌟 Overview

**JobPair AI** is a full-stack, production-ready SaaS platform that uses cutting-edge generative AI to help job seekers land their dream roles. Users sign in, upload their resume, and instantly get an in-depth AI-generated analysis — then explore four purpose-built career tools, each powered by Google's Gemini model.

The platform records every tool interaction in the user's personal history, enabling them to revisit past analyses, cover letters, roadmaps, and interview feedback at any time.

---

## 🔗 Live Demo

> **[https://jobpair-ai-beta.vercel.app](https://jobpair-ai-beta.vercel.app)**

---

## ✨ Features

### 📄 Resume Analyzer
- Upload a PDF resume and receive an instant AI-powered report
- **Overall score (0–100)** with a one-line verdict
- Section-level scores for **Contact Info, Experience, Education, and Skills**
- Actionable **tips for improvement**, **strengths**, and **areas to work on**
- Uploaded PDFs are stored on **ImageKit CDN** and linked back in the report
- Text extraction handled by a dedicated **FastAPI microservice** (Python + pypdf) deployed separately, bypassing Edge Runtime limitations

### 🗺️ Career Roadmap Generator
- Enter any job title or career goal
- Get a **visual, interactive roadmap** rendered with React Flow (`@xyflow/react`)
- Each node is an actionable milestone with a description and resource suggestions
- Export-ready layout for sharing or printing

### ✉️ Cover Letter Generator
- Provide the job title, company name, job description, preferred tone, and target length
- Gemini generates a fully structured cover letter: **intro → body → closing**
- Output includes tone classification and approximate word count
- One-click **PDF export** via jsPDF

### 🎙️ AI Mock Interview
- Select job role, level (Junior / Mid / Senior), type (Technical / Behavioral), and paste a job description
- Gemini generates a **custom question set** tailored to the role
- Conduct a **live voice interview** with a realistic AI interviewer powered by **Vapi AI** (ElevenLabs voice + Gemini 2.0 Flash transcription)
- Receive a structured **post-interview feedback report** with an overall score, per-question breakdown, strengths, and improvement areas

### 📂 Activity History
- Every tool session is persisted to PostgreSQL via **Prisma ORM**
- Users can browse and re-open any past analysis, roadmap, cover letter, or interview feedback
- Dashboard shows the 5 most recent activities with smart previews

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **UI Components** | shadcn/ui + Radix UI + Lucide React |
| **AI / LLM** | Google Gemini (`gemini-3-flash-preview`, `gemini-2.5-flash`) via `@google/genai` |
| **Voice AI** | Vapi AI (`@vapi-ai/web`) + ElevenLabs TTS |
| **Auth** | Clerk (`@clerk/nextjs`) |
| **Database** | PostgreSQL (via `pg` adapter) |
| **ORM** | Prisma 7 (Prisma Client v7) |
| **File Storage / CDN** | ImageKit |
| **Flow Diagrams** | React Flow (`@xyflow/react`) |
| **PDF Export** | jsPDF |
| **Resume Parsing** | FastAPI microservice (Python + pypdf) |
| **Package Manager** | Bun |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend (Vercel)              │
│                                                          │
│  Landing Page  →  Auth (Clerk)  →  Dashboard            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Resume       │  │ Roadmap      │  │ Cover Letter  │  │
│  │ Analyzer     │  │ Generator    │  │ Generator     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                 │            │
│  ┌──────▼─────────────────▼─────────────────▼────────┐  │
│  │           Next.js API Routes (/api/*)              │  │
│  └──────┬──────────────────────────────────┬──────────┘  │
│         │ Gemini API                        │ Prisma ORM  │
└─────────┼──────────────────────────────────┼─────────────┘
          │                                  │
    ┌─────▼──────┐    ┌──────────┐    ┌──────▼──────┐
    │ Google     │    │FastAPI   │    │ PostgreSQL  │
    │ Gemini AI  │    │(Python)  │    │ Database    │
    └────────────┘    │ PDF →    │    └─────────────┘
                      │ Text     │
                      └──────────┘
                           │
                    ┌──────▼──────┐
                    │  ImageKit   │
                    │  CDN        │
                    └─────────────┘
```

### Why a separate FastAPI service?

Next.js API routes run on the **Edge Runtime** in production, which does not support native Node.js modules required by PDF-parsing libraries. To reliably extract text from uploaded PDFs, the resume upload is forwarded to a standalone **FastAPI microservice** (Python + pypdf) that handles parsing and returns the extracted text. This keeps the Next.js deployment clean while ensuring robust PDF handling.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20 or **Bun** ≥ 1.1
- **PostgreSQL** database
- API keys for Clerk, Google Gemini, Vapi AI, and ImageKit

### 1. Clone the repository

```bash
git clone https://github.com/your-username/jobpair-ai.git
cd jobpair-ai
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

```bash
cp .env.example .env
# Fill in all required values (see Environment Variables section below)
```

### 4. Set up the database

```bash
bun prisma migrate dev
bun prisma generate
```

### 5. Start the development server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# ── Database ───────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:5432/jobpair"

# ── Clerk Auth ─────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_WEBHOOK_SECRET=whsec_...

# ── Google Gemini ──────────────────────────────────────
GEMINI_API_KEY=AIza...

# ── Vapi AI (Mock Interview voice) ────────────────────
NEXT_PUBLIC_VAPI_WEB_TOKEN=...
VAPI_API_KEY=...

# ── ImageKit (PDF CDN storage) ─────────────────────────
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=public_...
IMAGEKIT_PRIVATE_KEY=private_...
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id

# ── FastAPI Resume Parser microservice ────────────────
NEXT_PUBLIC_PDF_PARSER_URL=https://your-fastapi-service.com
```

---

## 📁 Project Structure

```
jobpair-ai/
├── app/
│   ├── api/
│   │   ├── analyze-resume/       # Proxies PDF to FastAPI, runs Gemini analysis
│   │   ├── generate-cover-letter/
│   │   ├── generate-questions/   # Generates interview Q&A with Gemini
│   │   ├── generate-roadmap/
│   │   ├── generate-feedback/    # Post-interview scoring
│   │   ├── get-interview/        # Fetches saved interview sessions
│   │   ├── history/              # CRUD for user activity history
│   │   └── webhooks/             # Clerk user sync webhook
│   ├── dashboard/
│   │   ├── page.tsx              # Dashboard home with tool grid + activity feed
│   │   ├── resume-analyzer/
│   │   ├── roadmap-generator/
│   │   ├── cover-letter-generator/
│   │   ├── mock-interview/
│   │   └── history/
│   ├── layout.tsx                # Root layout with Clerk provider
│   └── globals.css
│
├── components/
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── NavBar.tsx
│   ├── ResumeAnalysisDisplay.tsx # Scored card breakdown UI
│   ├── CoverLetterDisplay.tsx    # Formatted cover letter + PDF export
│   ├── RoadmapFlow.tsx           # React Flow interactive roadmap
│   └── ui/                       # shadcn/ui component library
│
├── lib/
│   ├── analyze.ts                # Gemini resume analysis prompt
│   ├── generateCoverLetter.ts    # Gemini cover letter prompt
│   ├── generateRoadmap.ts        # Gemini roadmap prompt
│   ├── generateQuestions.ts      # Gemini interview question prompt
│   ├── generateFeedback.ts       # Gemini post-interview feedback prompt
│   ├── interviewer.ts            # Vapi AI assistant configuration
│   ├── prisma.ts                 # Prisma client singleton
│   └── vapi.ts                   # Vapi web SDK singleton
│
├── prisma/
│   └── schema.prisma             # User, userHistory, Interview models
│
└── generated/
    └── prisma/                   # Auto-generated Prisma client
```

---

## 📡 API Reference

All routes are under `/api/` and are protected by Clerk authentication.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze-resume` | Upload PDF, parse text via FastAPI, analyze with Gemini, store history |
| `POST` | `/api/generate-cover-letter` | Generate cover letter from resume text + job details |
| `POST` | `/api/generate-roadmap` | Generate career roadmap nodes for a given role |
| `POST` | `/api/generate-questions` | Generate interview questions for role/level/type |
| `POST` | `/api/generate-feedback` | Score completed interview session |
| `GET` | `/api/get-interview` | Retrieve a saved interview session by ID |
| `GET` | `/api/history` | Fetch authenticated user's activity history |
| `POST` | `/api/webhooks` | Clerk webhook: sync new users to PostgreSQL |

---

## 🗄️ Database Schema

```prisma
model User {
  id        String        @id @default(cuid())
  clerkId   String        @unique
  email     String        @unique
  name      String?
  avatar    String?
  history   userHistory[]
  createdAt DateTime      @default(now())
}

model userHistory {
  id        String   @id @default(cuid())
  userId    String
  tool      ToolType          // RESUME_ANALYZER | ROADMAP_GENERATOR | COVER_LETTER_GENERATOR | MOCK_INTERVIEW
  input     Json
  output    Json
  createdAt DateTime @default(now())
}

model Interview {
  id              String   @id @default(cuid())
  userId          String
  jobRole         String
  jobDescription  String
  type            String
  level           String
  questions       Json
  feedback        String?
  createdAt       DateTime @default(now())
}
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ using Next.js, Google Gemini, and Vapi AI</p>
</div>
