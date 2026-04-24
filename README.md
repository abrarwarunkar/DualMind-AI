<div align="center">

# 🧠 DualMind

### Two Minds. One Truth.

*Dual-LLM research platform powered by Groq — Llama 3.3 70B & GPT-OSS 120B*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](https://nodejs.org)
[![Groq](https://img.shields.io/badge/Groq-Ultra--Fast%20Inference-orange.svg)](https://groq.com)

</div>

---

## 🎯 What is DualMind?

DualMind is a **dual-LLM research platform** that queries two different AI models simultaneously, grounds responses in real web sources and academic papers, and detects hallucinations through cross-model validation — all within a premium, dark-themed workspace.

### Key Capabilities

| Feature | Description |
|---|---|
| 🔬 **Dual LLM Analysis** | Query Llama 3.3 70B (Meta) and GPT-OSS 120B (OpenAI) side-by-side via Groq |
| 🌐 **Web-Grounded Research** | Fetch and scrape top sources, cite inline |
| 📚 **Academic Paper Search** | Search arXiv and Semantic Scholar for peer-reviewed papers |
| 🛡️ **Hallucination Detection** | Cross-model validation + source verification |
| 🧠 **Knowledge Graph** | Auto-extract entities and visualize research connections |
| 🔗 **Research Chains** | Chain follow-up questions with full context preservation |
| 📑 **Structured Summaries** | Title, key points, citations, confidence scores |
| 📤 **Multi-Format Export** | PDF (formatted) and Markdown downloads |
| 🌙 **Dark Mode** | Premium glassmorphism dark-first UI |

---

## 🧱 Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                      │
│              Next.js :3000                      │
├──────────────────┬──────────────────────────────┤
│   Pages          │        Backend API           │
│                  │        Express :5000          │
│   • Landing      │                              │
│   • Research     │   • Auth (JWT + bcrypt)       │
│   • Knowledge    │   • Research Pipeline         │
│     Graph        │   • LLM Service Layer         │
│   • Dashboard    │   • Search + Scraping         │
│                  │   • Academic Paper Search      │
│                  │   • Hallucination Engine       │
│                  │   • Export (PDF/MD)            │
├──────────────────┴──────────────────────────────┤
│                Supabase (PostgreSQL)            │
│  Users | Sessions | Notes | Knowledge Graph     │
├─────────────────────────────────────────────────┤
│          External APIs                          │
│   Groq │ arXiv │ Semantic Scholar │ SerpAPI     │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20
- Supabase project (for Postgres DB and Auth)
- Groq API key ([console.groq.com](https://console.groq.com))

### 1. Clone & Configure

```bash
git clone https://github.com/abrarwarunkar/DualMind-AI.git
cd DualMind-AI
cp .env.example .env
# Edit .env with your Groq API key and Supabase URL / Service Key
# Run the `server/supabase-schema.sql` in your Supabase SQL Editor
```

### 2. Install & Run Backend

```bash
cd server
npm install
npm run dev     # Starts on http://localhost:5000
```

### 3. Install & Run Frontend

```bash
cd client
npm install
npm run dev     # Starts on http://localhost:3000
```

### 4. Open the App

Navigate to `http://localhost:3000` — register an account and start researching!

---

## 📊 API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login | ❌ |
| `GET` | `/api/auth/me` | Get current user | ✅ |
| `POST` | `/api/research` | Run research pipeline | ✅ |
| `GET` | `/api/research` | List all sessions | ✅ |
| `GET` | `/api/research/:id` | Get session details | ✅ |
| `DELETE` | `/api/research/:id` | Delete session | ✅ |
| `POST` | `/api/export/pdf` | Export to PDF | ✅ |
| `POST` | `/api/export/markdown` | Export to Markdown | ✅ |

---

## 🔐 Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# AI (Groq)
GROQ_API_KEY=gsk_...

# Search (optional)
SERPAPI_KEY=...
```

> **Dev Mode:** The app works without API keys using mock responses — perfect for exploring the UI and testing locally!

---

## 📂 Project Structure

```
DualMind/
├── client/                    # Next.js Frontend
│   ├── app/                   # App Router pages
│   │   ├── dashboard/         # Research dashboard
│   │   ├── login/             # Auth login
│   │   ├── register/          # Auth register
│   │   ├── research/          # Research query + detail
│   │   ├── knowledge-graph/   # Knowledge graph visualization
│   │   ├── globals.css        # Design system
│   │   ├── layout.js          # Root layout
│   │   └── page.js            # Landing page
│   ├── components/            # Reusable components (Navbar)
│   ├── context/               # AuthContext
│   └── lib/                   # API client
├── server/                    # Express Backend
│   ├── config/                # DB + env config
│   ├── controllers/           # Route handlers
│   ├── middleware/             # Auth, rate limit, validation
│   ├── models/                # Mongoose schemas
│   ├── routes/                # Express routes
│   ├── services/              # Business logic
│   │   ├── llmService.js      # Dual-LLM (Llama 70B + GPT-OSS 120B)
│   │   ├── searchService.js   # Web search + scraping
│   │   ├── academicSearchService.js  # arXiv + Semantic Scholar
│   │   ├── summaryService.js  # Grounded summarization
│   │   ├── hallucinationService.js   # Hallucination detection
│   │   └── exportService.js   # PDF + Markdown export
│   └── utils/                 # Helpers + prompts
└── README.md                  # This file
```

---

## 🛡️ Security

- **Helmet** — HTTP security headers
- **CORS** — Origin whitelisting
- **Rate Limiting** — Tiered (general / AI / auth)
- **Joi Validation** — Input sanitization
- **bcrypt** — Password hashing (12 rounds)
- **JWT** — Stateless authentication

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ using Llama 3.3 70B, GPT-OSS 120B, Groq, Next.js, Express, and Supabase**

*Two Minds. One Truth.*

</div>
