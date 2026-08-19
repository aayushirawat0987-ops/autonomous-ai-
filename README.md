# Autonomous AI Creator 🤖📱

**Autonomous AI Creator** is a state-of-the-art, full-stack autonomous AI publishing intelligence platform. Once initialized with a single request (`POST /api/agent/init`) or through the modern web dashboard, the system independently discovers technology & AI news, executes **Threat Intelligence & Signal Correlation**, scores candidates on an **Opportunity Radar** (0–100 scale), enforces strict **AI Security** domain filtering, passes content through multi-agent **Fact-Checker** and **Critic** feedback loops with self-improvement rewrites, checks persistent database memory to prevent duplicates, and publishes short **LinkedIn/X style social posts (100–250 words)** continuously without human intervention.

It is **not** a simple chatbot—it is a fully **autonomous AI threat intelligence & social publishing agent system**.

---

## 🌟 Modern Web UI & Feature Highlights

The web interface (`http://localhost:3000`) is built with a glassmorphism theme, smooth animations, and rich telemetry:

### 1. 📊 Overview & KPI Control Center
* **Live System Metrics**: Track Active Agents, Total Content Created, Publication Approval Rate (%), and Average Quality Score in real time.
* **Autonomy Status & Manual Override**: View background scheduler status and trigger an instant autonomous discovery cycle (`Force Cycle`) with a single click.
* **Workflow Architecture Visualizer**: Interactive multi-stage visual pipeline depicting live execution states across discovery, threat intelligence, research, drafting, fact-checking, critic review, self-improvement, and publishing.

### 2. 🧠 ADA — Autonomous Threat Intelligence & Brain Dashboard
* **Central Intelligence Orb & Signal Network**: Animated central orb with dynamic SVG connection paths visualizing real-time threat signal aggregation and candidate topics.
* **Opportunity Radar**: Ranks discovered topics by momentum, AI security relevance, coverage level (Low/Medium/High), trend state (*Emerging*, *Growing*, *Rapidly Growing*), and automated recommendations (*MONITOR*, *PREPARE DRAFT*, *CREATE CONTENT*).
* **Live Mission & Telemetry Overlay**: Displays active agent mission states (`RUNNING`, `COMPLETED`) and real-time execution counters.
* **Global Metrics & Quality Radar**: Real-time telemetry tracking scanned signals, emerging trends, rejected candidates, generated drafts, approved posts, and quality score breakdowns (*Relevance*, *Novelty*, *Impact*, *Timeliness*, *Duplicate Risk*).

### 3. 🤖 Active Agents & Dedicated Agent Feeds
* **Multi-Agent Management**: View agent profiles, assigned technical domains, system roles, writing styles, total posts, and persistent memories.
* **Interactive Agent Workspace**: Filter feeds by specific agent, review last publication timestamps, and trigger targeted manual post generation.

### 4. 📰 Published Content Feed & Lifecycle Controls
* **LinkedIn/X Styled Post Cards**: Complete with technical hooks, threat breakdowns, remediation takeaways, source links, and domain hashtags (`#AISecurity #LLMSecurity #AISafety #CyberSecurity`).
* **Inline Content Editing**: Edit post headlines, body copy, platform targets, and publication status directly from the card.
* **AI Post Regeneration**: Re-trigger OpenAI post generation pipelines on demand for any existing post.
* **Post Lifecycle Actions**: Publish toggle, inline saving, and instant deletion capabilities.

### 5. 🛑 Rejected Content & Audit Telemetry
* **Audit Transparency**: Detailed log drawer showing topics rejected by the Editorial Engine or quality filters, complete with total scores, timestamped reasons, and weakness breakdown.
* **Live Telemetry Stream**: Real-time activity log tracking background cron triggers, signal connection, fact-checker corrections, and database operations.

---

## 🛡️ Domain Whitelist, Threat Intelligence & Quality Matrix

* **Signal Aggregation & Signal Correlation**: Aggregates signals across live RSS feeds, Hacker News, GitHub Trending, and arXiv papers, connecting overlapping technical indicators to detect emerging trends.
* **Opportunity Radar Scoring**: Evaluates momentum, coverage level, and trend potential:
  $$\text{Opportunity Score} = \text{Min}\left(100, 0.8 \times \text{Trend Potential} + \text{Coverage Bonus}\right)$$
  Recommends `CREATE CONTENT` for score $\ge 80$, `PREPARE DRAFT` for score $\ge 65$, or `MONITOR` otherwise.
* **Strict AI Security Whitelist**: Candidates are evaluated exclusively against: *AI Security*, *Prompt Injection*, *AI Safety*, *LLM Security*, *AI Vulnerabilities*, *Model Attacks*, *AI Agents Security*, *AI Privacy*, *AI Governance*, and *Secure AI Development*.
* **5-Metric Topic Scoring (Score > 80)**:
  $$\text{Total Score} = \text{Round}(0.35 \times \text{Relevance} + 0.25 \times \text{Impact} + 0.20 \times \text{Novelty} + 0.20 \times \text{Timeliness} - 0.40 \times \text{Duplicate Score})$$
  Only topics with **Total Score > 80**, **Relevance $\ge$ 70**, and **Duplicate Score < 30** pass to post generation.
* **Fact Checker & Critic Self-Improvement Loop**: Draft posts undergo verification by an AI Fact-Checker and Critic. If confidence is low or overall score is < 80, the system automatically performs up to 3 rewrite iterations before deciding whether to publish or reject.

---

## 🏗️ System Architecture & Workflow

```mermaid
flowchart TD
    A[POST /api/agent/init or UI Modal] --> B[Initialize Agent Persona in Database]
    B --> C[Start node-cron Background Scheduler]
    C --> D[Stage 1: Multi-Source Live Discovery]
    D -->|RSS, Hacker News, GitHub, arXiv| E[Normalized Candidate Topics]
    E --> F[Stage 2: Threat Intelligence & Signal Correlation]
    F -->|Detect Emerging Trends| G[Save Emerging Trend & Opportunity Radar Records]
    G --> H{Opportunity Recommendation?}
    H -->|MONITOR| I[Record Log & Monitor Signal]
    H -->|CREATE CONTENT / PREPARE DRAFT| J[Stage 3: AI Security Editorial Filter]
    J --> K{Passed Editorial Criteria & Score > 80?}
    K -->|No| I
    K -->|Yes| L[Stage 4: Writer Engine Draft Generation]
    L --> M[Stage 5: Fact-Checker & Critic Feedback Loop]
    M -->|Quality < 80 / Issues Found| N{Attempt <= 3?}
    N -->|Yes| O[AI Rewrite Generator]
    O --> M
    N -->|No| I
    M -->|Passed| P[Stage 6: Publish Post & Save Memory]
    P --> Q[Feed & Brain Dashboard Updated via API]
```

---

## 📁 Project Structure

```
autonomous-ai-creator/
├── api/
│   └── index.ts                # Vercel Serverless Function entrypoint
│
├── src/
│   ├── api/
│   │   ├── init.ts             # POST /api/agent/init endpoint
│   │   ├── feed.ts             # GET /api/agent/feed endpoint
│   │   └── agent.ts            # Agent status, list, trigger, logs, trends, opportunities, and post management APIs
│   │
│   ├── agent/
│   │   ├── scheduler.ts        # Background node-cron scheduling & mission execution pipeline
│   │   ├── topicDiscovery.ts   # Multi-source collector (RSS, HN, GitHub, arXiv)
│   │   ├── threatIntelligence.ts # Threat intelligence, signal grouping & opportunity radar engine
│   │   ├── editorial.ts        # Editorial evaluation & 0-100 topic scoring
│   │   ├── memory.ts           # Persistent topic memory & similarity deduplication
│   │   └── writer.ts           # Post generator, fact-checker & critic self-improvement loop
│   │
│   ├── services/
│   │   ├── openai.ts           # OpenAI Service (evaluations, writer, fact-checker, critic, rewrites)
│   │   ├── rss.ts              # RSS parser for tech blogs & security news
│   │   ├── hackernews.ts       # Hacker News REST API collector
│   │   ├── github.ts           # GitHub Trending repositories collector
│   │   └── arxiv.ts            # arXiv research papers API collector
│   │
│   ├── database/
│   │   └── prisma.ts           # Prisma ORM singleton client (with Vercel serverless /tmp fallback)
│   │
│   ├── prompts/
│   │   ├── personaPrompt.ts    # Persona system prompts
│   │   ├── editorialPrompt.ts  # Editorial scoring prompts
│   │   ├── writerPrompt.ts     # Social post writer prompts
│   │   ├── factCheckerPrompt.ts# Fact-checker verification prompts
│   │   ├── criticPrompt.ts     # Critic evaluation prompts
│   │   └── rewritePrompt.ts    # Self-improvement rewrite prompts
│   │
│   ├── models/
│   │   └── types.ts            # TypeScript interfaces & data models
│   │
│   ├── utils/
│   │   └── logger.ts           # System audit logger & database log persistence
│   │
│   ├── config/
│   │   └── index.ts            # App environment configurations
│   │
│   └── server.ts               # Express server & static dashboard asset handler
│
├── prisma/
│   └── schema.prisma           # Prisma Schema (Agent, Post, Memory, AgentLog, ImprovementAttempt, Mission, EmergingTrend, Opportunity, TrendSnapshot)
│
├── public/
│   └── index.html              # Glassmorphic Web Dashboard UI
│
├── vercel.json                 # Vercel serverless deployment & rewrite configuration
├── README.md                   # Complete documentation
├── .env.example                # Environment template
└── package.json                # Dependencies & npm scripts
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn**

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Ensure your `.env` specifies an OpenAI API key (optional fallback heuristic engines are used if omitted):
```env
PORT=3000
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="your-openai-api-key"
CRON_SCHEDULE="*/30 * * * *"
LOG_LEVEL="info"
```

### 4. Database Setup
Generate Prisma client and sync database schema:
```bash
npx prisma generate
npx prisma db push
```

### 5. Start Development Server
```bash
npm run dev
```

Open your browser and navigate to:
**`http://localhost:3000`**

---

## ☁️ Deployment (Vercel & Render)

### Deploying to Vercel
The project includes built-in support for Vercel Serverless Functions (`api/index.ts`):
1. Connect your repository to Vercel.
2. Vercel automatically uses the `vercel.json` configuration with `npx prisma generate && npx tsc` as the build command.
3. Set environment variable `OPENAI_API_KEY` in Vercel settings.

### Deploying to Render
Use the built-in Render build script in `package.json`:
```bash
npm run render-build
```

---

## 📡 API Reference

### Agent Initialization & Control

#### `POST /api/agent/init`
Initialize a new autonomous agent and launch its background scheduler.
* **Body**:
  ```json
  {
    "persona": {
      "name": "Ada",
      "domain": "AI Security",
      "role": "AI Security Researcher",
      "style": "technical, concise, analytical, evidence-based"
    }
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "agentId": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```

#### `GET /api/agent/list`
Fetch list of all active agents with post, memory, and log counts.

#### `GET /api/agent/status?agentId=<id>`
Retrieve agent metadata, total published posts, total memories, and last activity time.

#### `POST /api/agent/trigger`
Force an immediate autonomous discovery, threat intelligence, and publishing cycle for an agent.
* **Body**: `{ "agentId": "<id>" }`

#### `GET /api/agent/logs?agentId=<id>`
Retrieve telemetry and audit logs for an agent.

---

### Threat Intelligence & Opportunity Radar

#### `GET /api/agent/mission/latest?agentId=<id>`
Retrieve the active or latest mission state (`RUNNING`, `COMPLETED`) and associated threat trend for an agent.

#### `GET /api/agent/trends?agentId=<id>`
Retrieve recent emerging threat intelligence trends detected by the Signal Correlation Engine.

#### `GET /api/agent/opportunities?agentId=<id>`
Retrieve ranked Opportunity Radar records complete with momentum scores, coverage levels, trend states, and historical score snapshots.

---

### Content Feed & Post Management

#### `GET /api/agent/feed?agentId=<id>`
Retrieve all published posts for an agent ordered newest first.

#### `POST /api/agent/post/generate`
Manually trigger post generation for a specific topic with custom options.
* **Body**:
  ```json
  {
    "agentId": "<id>",
    "topic": "LLM Jailbreak Techniques",
    "postType": "Educational",
    "platform": "LinkedIn / X",
    "tone": "Professional",
    "instructions": "Focus on guardrails and input sandboxing."
  }
  ```

#### `PUT /api/agent/post/:id`
Update post details inline (title, content, platform, status).

#### `POST /api/agent/post/:id/regenerate`
Trigger an AI regeneration of an existing post draft.

#### `POST /api/agent/post/:id/publish`
Publish a draft post.

#### `DELETE /api/agent/post/:id`
Delete a post record from database.

---

## 📄 License
MIT
