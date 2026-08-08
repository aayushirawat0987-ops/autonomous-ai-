# PROMPT.md — Autonomous AI Creator Blueprint & Engineering Specification

## 1. Project Overview

**Autonomous AI Creator** is an autonomous AI publishing agent system designed for continuous, unassisted content curation in the **AI Security** domain.

After initialization via `POST /api/agent/init`, the agent (`Ada`) autonomously:
1. Discovers fresh AI/tech news from live RSS feeds, Hacker News, GitHub Trending, and arXiv.
2. Filters candidate topics strictly for **AI Security** relevance, rejecting non-security AI news (e.g. robotics, weather forecasting, healthcare AI, finance AI).
3. Scores candidate topics on a 0–100 scale across 5 metrics (*Relevance*, *Novelty*, *Impact*, *Timeliness*, *Duplicate Score*).
4. **Requires a Score > 80** to approve publication.
5. Logs all rejected candidate topics in the database along with explicit rejection reasons.
6. Cross-references database memory to prevent duplicate topic coverage.
7. Synthesizes concise **LinkedIn/X style social media posts (100–250 words)** with technical takeaways and hashtags.
8. Publishes posts persistently to a SQLite database and displays them in a LinkedIn-style feed UI.

---

## 2. Agent Workflow & Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant User/Client
    participant Express API
    participant Scheduler
    participant TopicDiscovery
    participant EditorialEngine
    participant MemoryEngine
    participant WriterEngine
    participant Database

    User/Client->>Express API: POST /api/agent/init { persona }
    Express API->>Database: Save Agent Persona
    Express API->>Scheduler: Register & Start Background Job
    Express API-->>User/Client: { agentId }

    loop Every 30-60 Minutes (Autonomous Loop)
        Scheduler->>TopicDiscovery: discoverAllTopics()
        TopicDiscovery-->>Scheduler: Raw Candidate Topics []
        
        loop For Each Discovered Topic
            Scheduler->>MemoryEngine: isDuplicate(topic)
            alt Memory Duplicate (duplicateScore >= 30)
                MemoryEngine-->>Scheduler: REJECT & Log Reason
            else Unique Topic
                Scheduler->>EditorialEngine: evaluateEditorial(persona, topic)
                alt Topic Unrelated to AI Security OR Total Score <= 80
                    EditorialEngine->>Database: Log Rejection with Explicit Reason
                else Total Score > 80 & AI Security Relevant
                    EditorialEngine-->>Scheduler: Approved (Score > 80)
                end
            end
        end
        
        alt Approved Candidate Topic
            Scheduler->>WriterEngine: createAndPublishPost(topic)
            WriterEngine->>Database: Save LinkedIn/X Post (100-250 words) & Memory Record
            WriterEngine-->>Scheduler: Post Published
        end
    end
```

---

## 3. Persona & Domain Specification

### Persona Attributes
- **Name**: Ada
- **Domain**: AI Security
- **Role**: AI Security Researcher
- **Writing Style**: Short LinkedIn / X social media post format (100–250 words), punchy, technical, analytical, evidence-based.

### Allowed Domain Whitelist
- AI Security
- Prompt Injection
- AI Safety
- LLM Security
- AI Vulnerabilities
- Model Attacks
- AI Agents Security
- AI Privacy
- AI Governance
- Secure AI Development

### Rejection Rules
- Rejects non-security topics (e.g. robotics, healthcare AI, finance AI, weather forecasting, generic LLM updates, art generation).
- Rejects clickbait, memes, marketing fluff, or unverified claims.

---

## 4. Topic Scoring Matrix (0–100 Scale)

Every candidate topic is evaluated on a 0–100 scale:

| Metric | Description | Score Range | Weight |
| :--- | :--- | :--- | :--- |
| **Relevance** | Direct focus on AI Security, LLM Vulnerabilities, Prompt Injection, Safety | 0–100 | $35\%$ |
| **Impact** | Architectural, security, or operational consequences | 0–100 | $25\%$ |
| **Novelty** | New vulnerability, zero-day, paper, or tool disclosure | 0–100 | $20\%$ |
| **Timeliness** | Active threat landscape relevance | 0–100 | $20\%$ |
| **Duplicate Score** | Memory overlap score (higher = duplicate) | 0–100 | Penalty $-40\%$ |

### Total Score Formula
$$\text{Total Score} = \text{round}\left(0.35 \times \text{Relevance} + 0.25 \times \text{Impact} + 0.20 \times \text{Novelty} + 0.20 \times \text{Timeliness} - 0.40 \times \text{Duplicate Score}\right)$$

**Publication Gate**: $\text{Total Score} > 80$ AND $\text{Relevance} \ge 70$ AND $\text{Duplicate Score} < 30$.

---

## 5. System Prompts

### Persona System Prompt (`src/prompts/personaPrompt.ts`)
```typescript
export function getPersonaSystemPrompt(persona: Persona): string {
  const role = persona.role || 'AI Security Researcher';
  const style = persona.style || 'technical, concise, analytical, skeptical, evidence-based, educational';

  return `You are an autonomous AI publishing agent named ${persona.name}.
Domain: ${persona.domain} (Strict Focus: AI Security, Prompt Injection, AI Safety, LLM Security, AI Vulnerabilities, Model Attacks, AI Agents Security, AI Privacy, AI Governance, Secure AI Development)
Role: ${role}
Writing Style: ${style} (LinkedIn / X social media post format, 100–250 words).

STRICT PUBLISHING RULES:
1. ONLY publish topics directly related to AI Security, Prompt Injection, AI Safety, LLM Security, AI Vulnerabilities, Model Attacks, AI Agents Security, AI Privacy, AI Governance, or Secure AI Development.
2. REJECT all topics unrelated to AI Security, even if they are general AI news (e.g. weather forecasting, robotics, healthcare AI, finance AI, generic LLM benchmarks).
3. Write posts as engaging, punchy LinkedIn/X style social media updates (100–250 words) with clear technical insights and relevant hashtags (#AISecurity #LLMSecurity #AISafety).
4. Maintain a professional, analytical, evidence-based tone. Never use clickbait or unsourced claims.`;
}
```

### Editorial Evaluation Prompt (`src/prompts/editorialPrompt.ts`)
```typescript
export function getEditorialEvaluationPrompt(persona: Persona, topic: DiscoveredTopic, memorySummaries: string[]): string {
  const personaContext = getPersonaSystemPrompt(persona);

  return `${personaContext}

EDITORIAL SCORING TASK:
Evaluate the following candidate topic on a scale of 0 to 100 for each metric.

Topic Details:
- Title: ${topic.title}
- Source: ${topic.source}
- URL: ${topic.url}
- Summary: ${topic.summary}
- Published At: ${topic.publishedAt}

Recent Memory (Topics already covered):
${memorySummaries.length > 0 ? memorySummaries.map(s => `- ${s}`).join('\n') : 'None yet.'}

ALLOWED DOMAIN WHITELIST:
- AI Security
- Prompt Injection
- AI Safety
- LLM Security
- AI Vulnerabilities
- Model Attacks
- AI Agents Security
- AI Privacy
- AI Governance
- Secure AI Development

CRITICAL REJECTION DIRECTIVES:
1. REJECT (relevance < 50) if the topic is NOT directly about AI Security or the allowed domain list.
   - Example non-security topics to REJECT: weather forecasting, robotics, healthcare AI, finance AI, generic LLM updates, art generation, or non-security benchmarks.
2. REJECT if duplicateScore >= 30 (already covered in memory).
3. Aggregate totalScore MUST BE STRICTLY GREATER THAN 80 to pass (totalScore > 80).

SCORING METRICS (0 to 100):
- relevance: How directly does this focus on AI Security / AI Safety / Prompt Injection / LLM Vulnerabilities? (0-100)
- novelty: Is this a new finding, vulnerability, paper, or tool? (0-100)
- impact: Does this have major technical/security consequences? (0-100)
- timeliness: Is this fresh and active? (0-100)
- duplicateScore: 0 = unique, 100 = duplicate (0-100)

Total Score Calculation:
totalScore = Math.round((relevance * 0.35) + (impact * 0.25) + (novelty * 0.20) + (timeliness * 0.20) - (duplicateScore * 0.4))

Output MUST be strictly valid JSON matching this schema:
{
  "scores": {
    "relevance": number,
    "novelty": number,
    "impact": number,
    "timeliness": number,
    "duplicateScore": number
  },
  "totalScore": number,
  "passed": boolean,
  "rejectionReason": "string (or null if passed)"
}`;
}
```

### Writer System Prompt (`src/prompts/writerPrompt.ts`)
```typescript
export function getWriterPrompt(persona: Persona, topic: DiscoveredTopic, evaluation: EditorialEvaluation): string {
  const personaContext = getPersonaSystemPrompt(persona);

  return `${personaContext}

ARTICLE WRITING TASK:
Write a high-impact LinkedIn / X style social media post (STRICTLY 100 TO 250 WORDS) for the approved AI Security topic below.

Topic Details:
- Title: ${topic.title}
- Source: ${topic.source}
- URL: ${topic.url}
- Summary: ${topic.summary}
- Editorial Score: ${evaluation.totalScore}/100

POST FORMATTING REQUIREMENTS (100–250 WORDS):
1. Hook: Attention-grabbing first line highlighting the AI Security / LLM threat or breakthrough.
2. Body: Concise breakdown of the technical vulnerability, attack vector, or security mechanism (2-3 bullet points or short paragraphs).
3. Takeaway: Clear actionable security advice for developers, security teams, or researchers.
4. Hashtags: Include 3-4 relevant hashtags (#AISecurity #LLMSecurity #AISafety #CyberSecurity).

Output MUST be strictly valid JSON matching this schema:
{
  "title": "string (Short punchy headline)",
  "content": "string (LinkedIn/X style social post, EXACTLY 100-250 words)",
  "rationale": "string (Why selected for AI Security persona)",
  "whySelected": "string (Technical selection justification)",
  "whyRelevantNow": "string (Timeliness and threat landscape impact)",
  "sources": ["string"]
}`;
}
```
---

# 6. AI Development Prompt History

This section records the major prompts used with Antigravity during the development of this project.

## Prompt 1 — Initial Project Generation

Build a complete, production-ready full-stack project called **Autonomous AI Creator**.

The application should create an autonomous AI persona that, after a single initialization request, independently discovers AI and technology news, decides whether it is worth publishing, remembers previous posts, and continues publishing over time without further human interaction.

This is not a chatbot. It is an autonomous AI publishing agent.

Use Node.js, Express.js, TypeScript, Prisma, SQLite, Axios, RSS Parser, node-cron, OpenAI API, and dotenv.

Implement autonomous scheduling, topic discovery, editorial evaluation, AI writing, memory, database persistence, persona configuration, API endpoints, error handling, and documentation.

The initial persona is:

- Name: Ada
- Domain: AI Security
- Role: AI Security Researcher

The main autonomous flow is:

Discover Topics
→ Evaluate Topics
→ Check Memory
→ Generate Post
→ Save Post
→ Continue Automatically

---

## Prompt 2 — AI Security and Content Improvements

Improve the autonomous agent.

Change generated content from long blog articles into **LinkedIn/X-style posts of 100–250 words**.

The AI Security persona should only publish topics related to:

- AI Security
- Prompt Injection
- AI Safety
- LLM Security
- AI Vulnerabilities
- Model Attacks
- AI Agents Security
- AI Privacy
- AI Governance
- Secure AI Development

Reject unrelated AI topics such as robotics, healthcare AI, finance AI, and weather forecasting.

Every approved post must include:

- Post content
- Rationale
- Why relevant now
- Sources

Add memory to prevent similar topics from being published twice.

Add topic scoring using:

- Relevance
- Novelty
- Impact
- Timeliness
- Duplicate Score

Only publish topics with a score greater than 80.

Store rejected topics with their rejection reasons.

Make the feed look like a LinkedIn feed.

Do not change the existing APIs.

---

## Prompt 3 — Fix and Complete the Autonomous Agent

Fix and complete the existing Autonomous AI Creator project for the AI hackathon.

Inspect the existing architecture, especially:

- package.json
- src/agent/
- scheduler.ts
- EditorialEvaluation
- API routes
- Prisma schema
- frontend API calls

Fix the TypeScript error:

`Property 'overallScore' does not exist on type 'EditorialEvaluation'`

Do not use `any` or `@ts-ignore`.

Fix the TypeScript server configuration and make the build, development, and production start commands work correctly.

Connect the existing OpenAI integration and make the AI agent genuinely functional.

The required flow is:

Persona
→ Initialize Agent
→ Scheduler
→ AI chooses topic
→ AI generates post
→ AI evaluates post
→ Calculate overall score
→ Score > 80 → APPROVE
→ Score <= 80 → REJECT
→ Save to Prisma
→ Show approved post in feed
→ Show rejected topics/logs

Connect:

`POST /api/agent/init`

to the real backend and do not send API requests to Live Server port 5500.

The scheduler must operate autonomously after initialization without requiring a new human prompt for every post.

Keep the existing UI and architecture.

Use environment variables for the OpenAI API key and never expose it to the frontend.

Add visible agent activity logs showing:

Topic Selected
→ Content Generated
→ Evaluation
→ Score
→ Approved/Rejected
→ Published

After implementation, run:

`npm run build`

and fix all build errors.

The final application must demonstrate real autonomous AI behavior rather than fake or static responses.

---

## Development Evolution

The project evolved through these prompts from an initial autonomous publishing architecture into a focused **AI Security autonomous agent** with:

- AI-powered topic discovery
- AI Security domain filtering
- Editorial scoring
- Duplicate prevention
- Persistent memory
- Autonomous scheduling
- AI content generation
- Quality-based approval/rejection
- Database persistence
- Agent activity logs
- LinkedIn-style publishing feed
#Prompt 4  

Upgrade the existing Autonomous AI Creator by adding a SELF-IMPROVEMENT LOOP and a new FACT-CHECKER AGENT.

Do not rebuild the project. Inspect the existing architecture and integrate these features into the current system.

1. SELF-IMPROVEMENT LOOP

After the Writer Agent generates a post:

Writer
  ↓
Critic/Evaluator
  ↓
Score the post
  ↓
Is score >= 80?
  ├── YES → Approve
  └── NO → Explain weaknesses
                ↓
             Rewrite
                ↓
          Evaluate again

The critic should evaluate:
- relevance
- originality
- clarity
- engagement
- factual quality
- safety
- overallScore

If the post scores below 80, the system should automatically send the weaknesses back to the Writer and generate an improved version.

Allow a maximum of 3 improvement attempts to prevent infinite loops.

Store every attempt in the database/logs:
- attempt number
- content
- scores
- weaknesses
- improvement suggestions
- final decision
- timestamp

The UI should visibly show this process in the Agent Activity Log, for example:

Draft generated
→ Score: 67
→ Critic found weaknesses
→ Rewrite attempt 1
→ Score: 78
→ Rewrite attempt 2
→ Score: 89
→ APPROVED

2. ADD A NEW FACT-CHECKER AGENT

Create a separate Fact-Checker Agent whose job is to check the generated AI-security content before final approval.

Flow:

Topic
 ↓
Researcher
 ↓
Writer
 ↓
Fact Checker
 ↓
Critic
 ↓
Rewrite if needed
 ↓
Final Evaluation
 ↓
Approve / Reject

The Fact Checker should check:
- unsupported factual claims
- suspicious statistics
- technically incorrect AI/security statements
- contradictions
- misleading claims
- missing context

Return structured results such as:

{
  "passed": true,
  "confidence": 0.91,
  "issues": [],
  "corrections": []
}

If factual problems are found, send the issues back to the Writer for correction.

Do not make the Fact Checker blindly approve content.

3. AGENT COLLABORATION

Make the agents have clear responsibilities:

Researcher Agent
→ Finds/generates relevant topic information.

Writer Agent
→ Creates the post.

Fact-Checker Agent
→ Checks factual/technical correctness.

Critic Agent
→ Evaluates quality and gives improvement feedback.

Scheduler
→ Starts the autonomous workflow.

The agents should pass structured information between each other rather than relying on uncontrolled text parsing.

4. IMPORTANT

Use the existing OpenAI integration and existing Prisma/database architecture.

Do not use fake/static AI responses.

Do not use `any` or `@ts-ignore` to hide TypeScript errors.

Reuse existing EditorialEvaluation types where possible and keep `overallScore` consistent throughout the project.

After implementation:

npm run build

Fix every TypeScript/build error.

Then verify that the complete autonomous flow works:

Topic selection
→ Research
→ Writing
→ Fact checking
→ Critique
→ Self-improvement/rewrite
→ Final score
→ Approval/Rejection
→ Feed
→ Activity logs

Keep the existing UI and add only the necessary UI changes to clearly visualize the multi-agent workflow.


#prompt 6 
Redesign the EXISTING Autonomous AI Creator frontend to look like a premium, modern AI product suitable for a winning hackathon demo.

IMPORTANT:
Do NOT rebuild the application logic.
Do NOT remove existing functionality.
Keep all existing API integrations, agent functionality, scheduler, database, and routes working.
This task is primarily a UI/UX transformation.

CURRENT PROBLEM:
The current UI looks like a basic AI-generated dashboard.
I want it to look polished, intentional, modern, and production-quality.

DESIGN DIRECTION:
Create a premium AI command-center aesthetic.

Use:
- Deep dark navy/near-black background
- Elegant violet/purple primary accent
- Cyan/blue secondary accent
- Subtle gradients
- Glassmorphism used carefully
- Soft borders and shadows
- Rounded cards
- High-quality typography
- Strong visual hierarchy
- Plenty of whitespace
- Minimal but meaningful animations

Avoid:
- Generic Bootstrap/admin-dashboard appearance
- Too many colors
- Huge gradients everywhere
- Excessive glowing effects
- Emoji-heavy UI
- Clutter
- Cheap-looking cards
- Default browser styling

==================================================
1. GLOBAL VISUAL STYLE
==================================================

Make the application feel like a serious AI startup product.

Background:
- Very dark navy/black
- Add extremely subtle radial gradients in the background

Cards:
- Slightly lighter translucent surfaces
- Thin subtle borders
- Soft shadows
- 16–20px border radius

Use a consistent design system for:
- spacing
- typography
- buttons
- cards
- badges
- inputs
- status indicators

Use one professional font family throughout the application.

==================================================
2. SIDEBAR
==================================================

Transform the sidebar into a premium navigation panel.

Include:

AUTONOMOUS AI CREATOR
small subtitle:
"AI Publishing Intelligence"

Navigation:

Overview
Agents
Content Feed
Activity
Rejected Content
Analytics
Settings

At the bottom show:

● System Online
Scheduler Active

Make the active navigation item visually distinct with a subtle gradient/background.

==================================================
3. TOP HEADER
==================================================

Create a clean top header.

Show:

"Autonomous AI Creator"

Subtitle:
"Your AI agents create, evaluate and improve content autonomously."

On the right:

● System Online

and a subtle timestamp such as:

Last activity: 2 min ago

==================================================
4. HERO / OVERVIEW
==================================================

Create a visually impressive hero section.

Title:

"Your AI is creating."

Subtitle:

"Autonomous agents research, write, fact-check, critique and publish content without waiting for a prompt."

Add a prominent status card:

AUTONOMY
ACTIVE

Show:

● Scheduler running
Next cycle: 08:45 PM
Threshold: 80

Add a subtle animated pulse to the ACTIVE indicator.

==================================================
5. KPI CARDS
==================================================

Create 4 premium metric cards:

ACTIVE AGENTS
3

CONTENT CREATED
24

APPROVAL RATE
87%

AVG QUALITY SCORE
91

Each card should have:
- small label
- large number
- subtle icon
- small trend indicator

Make them visually clean rather than huge.

==================================================
6. AGENT SECTION
==================================================

Create beautiful agent cards.

Example:

ADA
AI SECURITY CREATOR

● ACTIVE

Researcher
Writer
Fact Checker
Critic

Show a small visual workflow:

Research → Write → Verify → Critique → Publish

Each agent card should feel like an AI product component.

Allow clicking an agent to view its details.

==================================================
7. AGENT WORKFLOW VISUALIZATION
==================================================

Create a beautiful horizontal workflow:

TOPIC DISCOVERY
      ↓
RESEARCH
      ↓
WRITER
      ↓
FACT CHECK
      ↓
CRITIC
      ↓
SELF-IMPROVE
      ↓
PUBLISH

Each stage should be represented by a small elegant card/node.

Show the currently active stage with a subtle animated glow/pulse.

This is VERY IMPORTANT for the hackathon because judges should immediately understand the autonomous architecture.

==================================================
8. LIVE ACTIVITY
==================================================

Create a premium "Live Agent Activity" panel.

Example:

● 18:42:03
Topic discovered
"Prompt Injection in Multi-Agent Systems"

● 18:42:08
Research completed

● 18:42:14
Draft generated

● 18:42:18
Fact check completed
2 claims verified

● 18:42:22
Critic score: 76

● 18:42:25
Self-improvement started

● 18:42:31
Final score: 91

✓ Published

Use subtle animations when new events appear.

==================================================
9. CONTENT FEED
==================================================

Redesign the LinkedIn-style feed into a premium content experience.

Each post should show:

Agent avatar
Agent name
Domain
Timestamp

Post title
Content preview

Quality score:
91 / 100

Badges:

✓ Fact Checked
✓ Critic Approved
✓ AI Generated

Add subtle interaction buttons such as:

View
Details
Decision Trace

Do not make it look like a direct copy of LinkedIn.

==================================================
10. DECISION TRACE
==================================================

When a post is opened, show a beautiful side panel/modal explaining:

WHY THIS TOPIC?
WHY THIS POST?
FACT CHECK RESULT
CRITIC SCORE
IMPROVEMENT ATTEMPTS
FINAL DECISION

Example:

Topic relevance       94
Originality           88
Clarity               92
Factual accuracy      96
Engagement            87

Overall Score         91

✓ APPROVED

This should make the AI's reasoning process visually understandable without exposing hidden chain-of-thought.

==================================================
11. REJECTED CONTENT
==================================================

Create a clean rejected-content page.

Each rejected item should show:

Topic
Score
Reason
Improvement attempts
Timestamp

Use restrained red/orange warning accents rather than making the whole interface red.

==================================================
12. INITIALIZE AGENT EXPERIENCE
==================================================

Make the "Initialize Persona & Scheduler" experience much better.

Use a polished modal/card.

Fields:

Persona Name
Domain
Writing Style
Autonomy Level
Quality Threshold

Button:

"Launch Agent"

When clicked, show a short visual initialization sequence:

Initializing Persona...
Connecting AI...
Loading Memory...
Starting Scheduler...
Agents Ready ✓

Then transition to:

ADA IS ONLINE

Do not fake backend states. The animation must reflect actual API responses.

==================================================
13. COLORS
==================================================

Use a refined palette.

Primary:
Violet / electric purple

Secondary:
Cyan / blue

Background:
Near-black navy

Positive:
Soft green

Warning:
Amber

Error:
Soft red

Do NOT use bright rainbow colors.

Maintain accessibility and readable contrast.

==================================================
14. ANIMATIONS
==================================================

Add subtle professional animations:

- card hover
- page transitions
- agent status pulse
- workflow progress
- activity log entry
- modal transitions
- button feedback
- skeleton loading

Animations should feel smooth and premium.

Do NOT over-animate the application.

==================================================
15. RESPONSIVENESS
==================================================

Make the dashboard responsive for:

Desktop
Laptop
Tablet
Mobile

The main hackathon demo is desktop, but the interface should not break on smaller screens.

==================================================
16. FINAL QUALITY CHECK
==================================================

After redesign:

- Remove unused CSS
- Fix spacing inconsistencies
- Fix overflow issues
- Make buttons consistent
- Make typography consistent
- Check all pages
- Check all existing API functionality
- Check initialization flow
- Check content feed
- Check activity logs
- Check agent status
- Check rejected content
- Make sure no existing functionality is broken

MOST IMPORTANT:

The final result should look like a product created by a professional startup design team, not a generic AI-generated dashboard.

Think:
"premium AI command center"
rather than:
"admin panel".

Keep the interface elegant, minimal, futuristic, and highly presentable for a hackathon jury.

