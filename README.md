<div align="center">

# 🧠 ResearchMind AI

### AI-Powered Multi-LLM Research Assistant

*Perplexity meets Notion — powered by GPT-4o & Claude 3.5*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)

</div>

---

## 🎯 What is ResearchMind AI?

ResearchMind AI is a **production-ready SaaS platform** that supercharges research by querying multiple Large Language Models simultaneously, grounding responses in real web sources, and detecting hallucinations — all within a beautiful, Notion-style workspace.

### Key Capabilities

| Feature | Description |
|---|---|
| 🔬 **Dual LLM Analysis** | Query GPT-4o and Claude 3.5 Sonnet side-by-side |
| 🌐 **Web-Grounded Research** | Fetch and scrape top sources, cite inline |
| 🛡️ **Hallucination Detection** | Cross-model validation + source verification |
| 📑 **Structured Summaries** | Title, key points, citations, confidence scores |
| 📤 **Multi-Format Export** | PDF (formatted) and Markdown downloads |
| 🔗 **GitHub Sync** | Push research notes directly to your repos |
| 🔐 **Auth & Workspaces** | JWT auth, role-based access (Basic/Pro) |
| 🌙 **Dark Mode** | Premium glassmorphism dark-first UI |

---

## 🧱 Architecture

```
┌─────────────────────────────────────────────────┐
│                   NGINX (Reverse Proxy)         │
│              :80 / :443 (HTTPS)                 │
├──────────────────┬──────────────────────────────┤
│   Frontend       │        Backend API           │
│   Next.js :3000  │        Express :5000         │
│                  │                              │
│   • Landing      │   • Auth (JWT + bcrypt)      │
│   • Research     │   • Research Pipeline        │
│   • Dashboard    │   • LLM Service Layer        │
│   • Notes        │   • Search + Scraping        │
│                  │   • Hallucination Engine      │
│                  │   • Export (PDF/MD)           │
│                  │   • GitHub Sync              │
├──────────────────┴──────────────────────────────┤
│              MongoDB (Atlas / Docker)            │
│       Users │ ResearchSessions │ Notes          │
├─────────────────────────────────────────────────┤
│          External APIs                          │
│   OpenAI │ Anthropic │ SerpAPI │ GitHub         │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20
- MongoDB (local or Atlas)
- API keys: OpenAI, Anthropic, SerpAPI (optional for dev mode)

### 1. Clone & Configure

```bash
git clone https://github.com/your-username/researchmind-ai.git
cd researchmind-ai
cp .env.example .env
# Edit .env with your API keys and MongoDB URI
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

## 🐳 Docker Deployment

```bash
# Start everything (MongoDB + Redis + App + NGINX)
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

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
| `POST` | `/api/github/connect` | Connect GitHub | ✅ |
| `POST` | `/api/github/sync` | Sync to repo | ✅ |
| `GET` | `/api/github/repos` | List repos | ✅ |
| `GET` | `/api/notes` | List notes | ✅ |
| `PUT` | `/api/notes/:id` | Update note | ✅ |

---

## 🔐 Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/researchmind
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SERPAPI_KEY=...

# GitHub (optional)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

> **Dev Mode:** The app works without API keys using mock responses — perfect for exploring the UI and testing locally!

---

## 🧪 Testing

```bash
cd server
npm test          # Run all tests
npm run test:watch  # Watch mode
```

Tests cover:
- ✅ Authentication (register, login, JWT validation)
- ✅ LLM Service (mock responses)
- ✅ Search & Scraping (HTML cleaning)
- ✅ Hallucination Detection
- ✅ Export (PDF generation, Markdown formatting)

---

## ☁️ AWS Production Deployment

1. **EC2**: Launch Ubuntu instance, install Docker
2. **MongoDB Atlas**: Create cluster, whitelist EC2 IP
3. **Domain**: Point DNS to EC2 Elastic IP
4. **SSL**: Add Let's Encrypt via Certbot
5. **CI/CD**: Configure GitHub Secrets (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`)
6. **Deploy**: Push to `main` branch → auto-deploys via GitHub Actions

---

## 📂 Project Structure

```
ResearchMind AI/
├── client/                    # Next.js Frontend
│   ├── app/                   # App Router pages
│   │   ├── dashboard/         # Workspace dashboard
│   │   ├── login/             # Auth login
│   │   ├── register/          # Auth register
│   │   ├── research/          # Research query + detail
│   │   ├── globals.css        # Design system
│   │   ├── layout.js          # Root layout
│   │   └── page.js            # Landing page
│   ├── components/            # Reusable components
│   ├── context/               # AuthContext
│   └── lib/                   # API client
├── server/                    # Express Backend
│   ├── config/                # DB + env config
│   ├── controllers/           # Route handlers
│   ├── middleware/             # Auth, rate limit, validation
│   ├── models/                # Mongoose schemas
│   ├── routes/                # Express routes
│   ├── services/              # Business logic
│   │   ├── llmService.js      # Multi-LLM abstraction
│   │   ├── searchService.js   # Web search + scraping
│   │   ├── summaryService.js  # Grounded summarization
│   │   ├── hallucinationService.js  # Hallucination detection
│   │   ├── exportService.js   # PDF + Markdown
│   │   └── githubService.js   # GitHub sync
│   ├── utils/                 # Helpers + prompts
│   └── __tests__/             # Jest tests
├── nginx/                     # NGINX config
├── .github/workflows/         # CI/CD pipeline
├── Dockerfile                 # Multi-stage build
├── docker-compose.yml         # Full stack
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

## 📈 Scalability

- Modular service architecture
- Stateless backend (horizontal scaling ready)
- Separate AI service layer
- MongoDB indexes on userId + createdAt
- NGINX load balancing ready
- Docker container orchestration

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ using GPT-4o, Claude 3.5, Next.js, Express, and MongoDB**

</div>
