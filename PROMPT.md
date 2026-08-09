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


# prompt 6 
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

# prompt 7 
Improve ONLY the frontend UI of the existing Autonomous AI Creator.

Do not change backend logic, APIs, database, agent functionality, or data flow.

Replace the current black/dark-heavy design with a modern, clean, premium AI/SaaS dashboard.

Color theme:
- Main background: very light cool gray/white
- Cards: white
- Primary: deep indigo/blue
- Secondary accent: cyan/teal
- Active/success: green
- Rejected/error: red
- Main text: dark navy
- Secondary text: muted gray
- Borders: subtle light gray

UI requirements:
- Clean modern sidebar
- Professional top navigation/header
- White rounded cards with subtle shadows
- Better spacing and typography
- Clear visual hierarchy
- Modern buttons with hover states
- Modern inputs, dropdowns and status badges
- Replace harsh black backgrounds with the new light theme
- Keep the UI consistent across every page/component
- Make the LinkedIn-style feed visually polished
- Make Agent Active/Inactive states visually clear
- Use subtle animations and transitions where appropriate
- Make the entire interface responsive

Important:
Inspect the existing frontend first and modify the current components/styles instead of rebuilding the application.

Do not change any functionality.
Only improve the visual design, colors, spacing, typography, components and responsiveness.

The final UI should look like a polished modern AI startup product suitable for an AI hackathon demo, not a generic dark developer dashboard.

#prompt 8 
Modify my EXISTING Autonomous AI Creator website.

DO NOT create a new website from scratch.
DO NOT redesign the entire application.
DO NOT remove existing functionality.

First inspect the existing project, understand its current frontend, backend, database/storage, routing, agent structure, and AI generation flow. Then implement the following changes using the existing architecture.

==================================================
MAIN REQUIREMENT
==================================================

On the "Active Agents" page, each agent card currently has:

"Select →"

The Select button is currently not working.

MAKE IT FULLY FUNCTIONAL.

When I click Select on an agent, it must open that SPECIFIC AGENT'S feed/details.

For example:

ADA
CYBER SECURITY
2 Posts
[Select →]

When clicked, open ADA's Cyber Security Agent Feed.

Do NOT show another agent's posts.

==================================================
AGENT-SPECIFIC FEED
==================================================

Create an Agent Details / Agent Feed view using the existing UI design.

The selected agent page should show:

- Agent name
- Agent avatar
- Agent topic
- Active/Inactive status
- Roles
- Total posts generated
- Last generated post
- Agent feed

Example:

ADA
CYBER SECURITY

● ACTIVE

Researcher • Writer • Fact Checker • Critic

2 Posts Generated

--------------------------------

AGENT FEED

Post 1
Post 2
Post 3
...

Each agent MUST have its own separate feed.

For example:

ADA - Cyber Security
→ only Cyber Security posts

ANYA - About Python
→ only About Python posts

ADA - AI Security
→ only AI Security posts

Do NOT mix posts between agents.

==================================================
REAL POST COUNT
==================================================

The post count shown on the Agent Card must come from actual saved posts.

DO NOT hardcode:

"2 Posts"
"5 Posts"
"6 Posts"

Instead calculate the count from the database/storage.

If ADA currently has 2 posts:

ADA → 2 Posts

If I generate another post:

ADA → 3 Posts

The count must automatically update on:

1. Agent card
2. Agent details page
3. Agent feed

If a post is deleted:

3 Posts → 2 Posts

The count must update automatically.

==================================================
GENERATE NEW POST
==================================================

Inside every Agent Feed, add a prominent button:

+ Generate New Post

When clicked, open a generation form/modal.

The selected agent must automatically be used.

Example:

Agent:
ADA

Topic:
Cyber Security

Post Type:
Educational

Platform:
LinkedIn / X

Tone:
Professional

Additional Instructions:
[ input ]

[ Generate Post ]

The generated post MUST belong to the selected agent.

Save the generated post.

Immediately display the new post in that agent's feed.

Update the post count automatically.

Do NOT refresh the entire application manually just to show the new post.

==================================================
POST DATA
==================================================

Every post should have at least:

id
agentId
title
content
topic
platform
status
createdAt
updatedAt

The critical relationship is:

AGENT
   ↓
agentId
   ↓
POSTS

Every post MUST know which agent generated it.

==================================================
POST CARD
==================================================

Each post in the Agent Feed should display:

- Post title
- Post content
- Agent name
- Topic
- Platform
- Created date/time
- Status

Actions:

[ Edit ]
[ Regenerate ]
[ Delete ]
[ Publish ]

Use the existing application's styling.

Do not create an unrelated design.

==================================================
EDIT POST
==================================================

When Edit is clicked:

Allow the user to modify the post.

After saving:

- Update the post
- Update the feed immediately
- Persist the change

==================================================
DELETE POST
==================================================

When Delete is clicked:

Ask for confirmation.

After deletion:

- Remove the post from feed
- Decrease post count
- Update Agent Card
- Persist deletion

The deleted post must NOT come back after page refresh.

==================================================
REGENERATE POST
==================================================

Add a Regenerate action.

When clicked, regenerate content for that specific post/agent using the existing AI generation system.

Make sure the regenerated content belongs to the same agent.

==================================================
PUBLISH
==================================================

If the project already contains publishing functionality, connect the Publish button to the existing implementation.

If publishing is not implemented yet, use a clear status system such as:

Draft
Generated
Published
Failed

Do not create fake external publishing.

==================================================
BACK NAVIGATION
==================================================

Inside the Agent Feed add:

← Back to Agents

Clicking it must return to the Active Agents page.

Use the existing routing/navigation system if one exists.

Do NOT create duplicate navigation systems.

==================================================
EMPTY STATE
==================================================

If an agent has zero posts, display:

No posts generated yet.

Start creating content for this agent.

[ + Generate New Post ]

Do not display fake/demo posts for an agent that has no posts.

==================================================
LOADING STATE
==================================================

When loading an agent feed, display a professional loading/skeleton state.

When generating a post, display:

Generating...
Researching topic...
Writing content...
Fact checking...
Finalizing...

Use the existing AI workflow if available.

==================================================
IMPORTANT AUTONOMOUS AI CREATOR LOGIC
==================================================

The application should follow:

Agent
 ↓
Discover Topic
 ↓
Research
 ↓
Evaluate
 ↓
Generate Content
 ↓
Fact Check
 ↓
Critic Review
 ↓
Final Post
 ↓
Save Post
 ↓
Agent Feed
 ↓
Update Post Count

The Agent Feed represents the REAL content history generated by that agent.

Do NOT generate random posts every time the page is opened.

Do NOT store posts only in temporary frontend state.

Use the existing database/backend/storage system.

==================================================
EXISTING AGENTS
==================================================

Keep the existing agents.

For example:

ADA
Topic: Cyber Security

ANYA
Topic: About Python

ADA
Topic: AI Security

These are separate agent records even if two agents have the same name.

Use a UNIQUE agent ID to distinguish them.

Example:

agentId: agent_001
name: ADA
topic: Cyber Security

agentId: agent_002
name: ANYA
topic: About Python

agentId: agent_003
name: ADA
topic: AI Security

Posts must reference agentId, NOT just agent name.

==================================================
AGENT CARD
==================================================

Keep the current card design.

Each card should show:

Agent avatar
Agent name
Topic
ACTIVE status
Roles
Actual post count
Select →

Improve the Select button with:

- pointer cursor
- hover effect
- click feedback
- proper navigation
- disabled/loading state if necessary

Most importantly:

CLICKING SELECT MUST ACTUALLY OPEN THE CORRECT AGENT.

==================================================
DATA PERSISTENCE
==================================================

Inspect the existing project and use its current database/storage.

If a database already exists:

DO NOT create another unnecessary database.

Extend the existing data model.

If posts already exist:

Migrate/connect them to the correct agentId without destroying existing data.

If the project currently uses local storage/mock data:

Refactor it carefully so the agent/post relationship is persistent and consistent.

==================================================
DO NOT BREAK EXISTING FEATURES
==================================================

Before changing anything:

1. Inspect the existing project.
2. Understand the current architecture.
3. Identify how agents are stored.
4. Identify how posts are stored.
5. Identify how AI generation works.
6. Identify current routing.
7. Reuse existing components and functions.

Do not rewrite unrelated parts of the application.

Do not remove existing features.

Do not change the overall visual identity.

==================================================
FINAL TESTING
==================================================

After implementation, test all of these:

TEST 1:
Open Active Agents.

TEST 2:
Click ADA Cyber Security → Select.

Expected:
ADA Cyber Security feed opens.

TEST 3:
Verify only ADA Cyber Security posts are shown.

TEST 4:
Go back.

TEST 5:
Click ANYA About Python → Select.

Expected:
Only ANYA's posts appear.

TEST 6:
Click ADA AI Security → Select.

Expected:
Only ADA AI Security posts appear.

TEST 7:
Generate a new post for ADA Cyber Security.

Expected:

2 Posts
↓
3 Posts

The new post appears immediately in ADA Cyber Security feed.

TEST 8:
Refresh the browser.

Expected:
The new post is still there.

TEST 9:
Return to Active Agents.

Expected:
ADA Cyber Security shows the updated post count.

TEST 10:
Delete a post.

Expected:
Post disappears and count decreases.

TEST 11:
Edit a post.

Expected:
Changes persist after refresh.

TEST 12:
Generate posts for two different agents.

Expected:
Posts remain separated by agentId.

==================================================
CRITICAL REQUIREMENT
==================================================

DO NOT JUST MAKE THE "Select →" BUTTON LOOK CLICKABLE.

IMPLEMENT THE COMPLETE FUNCTIONAL FLOW:

Active Agents
      ↓
Select →
      ↓
Specific Agent Details
      ↓
Specific Agent Feed
      ↓
Generate New Post
      ↓
Save Post with agentId
      ↓
Feed Updates
      ↓
Post Count Updates
      ↓
Data Persists After Refresh

The final result should feel like a production-ready Autonomous AI Creator dashboard where every AI agent has its own persistent content history and can continuously generate and manage its own posts.

After implementation, run the application and verify that the complete flow works without console errors, routing errors, database errors, or broken buttons.
# prompt 8
# CONTENT GENERATION QUALITY UPGRADE — AUTONOMOUS AI CREATOR

Improve the **AI-generated content/post generation system** of my existing Autonomous AI Creator.

IMPORTANT:

Do NOT change the website layout.

Do NOT change the dashboard UI.

Do NOT change the database structure unless absolutely necessary.

Do NOT change the autonomous workflow.

Only improve the **quality, structure, readability, professionalism, and consistency of generated content**.

The generated posts must feel like they were written by a knowledgeable **AI Security researcher**, not like generic AI-generated text.

---

# 1. STRICT WORD LIMIT

Every generated social media post must contain:

### Minimum: 150 words

### Maximum: 220 words

Target:

**180–200 words**

Never generate:

* less than 150 words
* more than 220 words

The word count must be calculated from the final generated content.

Display the word count in the dashboard.

Example:

**Word Count: 187 / 220**

If the generated content exceeds 220 words:

→ automatically rewrite/shorten it.

If it is below 150 words:

→ automatically expand it with useful technical explanation.

Do not add meaningless filler just to reach the word count.

---

# 2. FIXED PROFESSIONAL STRUCTURE

Every generated post must follow this structure.

## SECTION 1 — HOOK

1–2 sentences.

Immediately explain the important development/security issue.

The opening should create interest without using clickbait.

Example style:

"AI agents are becoming more capable—but their growing autonomy also creates a new attack surface: indirect prompt injection."

---

## SECTION 2 — WHAT HAPPENED?

2–3 sentences.

Clearly explain:

* What happened?
* What technology is involved?
* Who discovered/reported it?
* What is new?

Use verified information from the available source.

Do NOT invent facts.

---

## SECTION 3 — WHY IT MATTERS

2–4 sentences.

Explain the real-world security impact.

Focus on:

* risk
* affected systems
* attack surface
* potential consequences
* why organizations should care

The explanation must be understandable to a technical student as well as a professional reader.

---

## SECTION 4 — TECHNICAL BREAKDOWN

3–5 sentences.

Explain the underlying technical concept.

For example:

* prompt injection
* LLM vulnerability
* agent manipulation
* data leakage
* model attack
* insecure tool use
* excessive permissions
* memory poisoning

Use technically correct terminology.

However:

### DO NOT use unnecessarily complicated language.

Explain technical terms naturally.

Example:

Instead of:

"Adversarially crafted indirect instructions exploit the model's contextual instruction hierarchy."

Prefer:

"An attacker can place malicious instructions inside external content that the AI agent reads. If the agent treats that content as trusted instructions, the attacker may influence its next action."

---

## SECTION 5 — SECURITY TAKEAWAYS

Use 3 concise bullet points.

Example:

• Treat external content as untrusted input.

• Restrict agent permissions to the minimum required.

• Validate tool calls before executing sensitive actions.

These should provide practical defensive value.

---

## SECTION 6 — CONCLUSION

1–2 sentences.

End with a strong professional insight.

The conclusion should explain what developers/security teams should remember.

---

## SECTION 7 — HASHTAGS

Add 4–6 relevant hashtags.

Examples:

#AISecurity
#LLMSecurity
#AISafety
#PromptInjection
#CyberSecurity
#AI

Only use hashtags relevant to the actual topic.

Do NOT add random hashtags.

---

# 3. LANGUAGE STYLE

The generated content must use:

### Professional + Knowledgeable + Clear + Human-readable language

The writing should sound like:

**An experienced AI Security researcher explaining a complex topic clearly.**

NOT like:

* a textbook
* a marketing advertisement
* a generic chatbot
* an academic paper
* overly complicated technical documentation

---

# 4. READABILITY RULE

Use short paragraphs.

Most sentences should be between:

10–25 words.

Avoid extremely long sentences.

Avoid unnecessary jargon.

When technical terminology is necessary, explain it briefly.

Example:

"Prompt injection is a technique where malicious instructions are inserted into content an AI system processes."

This is better than assuming the reader already knows the term.

---

# 5. PROFESSIONAL WRITING RULES

Every post must:

* Start with a strong but factual hook.
* Clearly explain the event.
* Explain why it matters.
* Explain the technical mechanism.
* Provide practical security recommendations.
* End with a meaningful conclusion.
* Use verified facts.
* Avoid repetition.
* Avoid filler.
* Avoid exaggerated claims.

---

# 6. NO FAKE INFORMATION

This is extremely important.

The Writer Agent must ONLY use information supported by the discovered sources and research.

Never invent:

* company statements
* researchers
* CVE numbers
* vulnerability severity
* attack statistics
* dates
* affected products
* research findings
* quotes
* URLs

If a fact cannot be verified:

Do not state it as fact.

---

# 7. SOURCE-AWARE WRITING

The generated post should be based on the actual discovered topic.

Before writing:

1. Read the available source information.
2. Identify the main security development.
3. Extract verified facts.
4. Identify technical significance.
5. Identify practical defensive recommendations.
6. Generate the post.

Do NOT generate a generic AI Security article unrelated to the source.

---

# 8. FACT CHECKER IMPROVEMENT

The Fact Checker should verify:

### Accuracy

Are the claims supported?

### Technical correctness

Is the security explanation technically accurate?

### Source consistency

Does the post match the source?

### No hallucinations

Did the writer invent anything?

### Relevance

Does the post actually discuss the selected topic?

### Word count

Is the post between 150–220 words?

If any check fails:

→ send the post to the Rewrite Agent.

---

# 9. CRITIC AGENT

The Critic should score the generated content from 0–100.

Evaluate:

### 1. Accuracy — 25%

### 2. Technical Knowledge — 20%

### 3. Relevance — 20%

### 4. Readability — 15%

### 5. Professionalism — 10%

### 6. Structure — 10%

Required:

**Overall Score >= 80**

If score < 80:

→ generate improvement feedback.

Then:

→ Rewrite.

Maximum:

**3 improvement attempts.**

---

# 10. SELF-IMPROVEMENT LOOP

The content generation pipeline should work like:

SOURCE

↓

RESEARCH

↓

DRAFT

↓

WORD COUNT CHECK

↓

FACT CHECKER

↓

CRITIC

↓

QUALITY SCORE

↓

IF SCORE < 80

↓

REWRITE

↓

FACT CHECKER

↓

CRITIC

↓

FINAL APPROVAL

Only approved content should reach the publishing stage.

---

# 11. CONTENT FORMAT EXAMPLE

Every generated post should approximately follow this structure:

**HOOK**

AI agents are gaining the ability to independently browse, reason and use external tools. That autonomy also introduces a growing security risk: prompt injection.

**WHAT HAPPENED?**

Researchers identified a technique where malicious instructions can be embedded inside external content consumed by an AI agent. When the agent interprets that content as trusted instructions, the attacker may influence its behavior.

**WHY IT MATTERS**

This becomes especially dangerous when agents have access to email, files, databases or external tools. A successful attack could potentially cause unintended actions or expose sensitive information.

**TECHNICAL BREAKDOWN**

The core problem is the lack of a strong boundary between data and instructions. An agent may process attacker-controlled content as part of its context and incorrectly follow embedded commands. Limiting permissions and validating tool calls can reduce this risk.

**SECURITY TAKEAWAYS**

• Treat external content as untrusted input.

• Apply least-privilege permissions to AI agents.

• Validate sensitive tool calls before execution.

**CONCLUSION**

As AI systems become more autonomous, security must extend beyond the model itself to the tools, data and permissions surrounding it.

#AISecurity #PromptInjection #LLMSecurity #AISafety #CyberSecurity

---

# 12. DASHBOARD DISPLAY

When displaying generated content in the existing feed, show:

### Content Quality

**92 / 100**

### Word Count

**187 / 220 words**

### Content Structure

✓ Hook
✓ Context
✓ Impact
✓ Technical Breakdown
✓ Security Takeaways
✓ Conclusion

### Verification

✓ Fact Checked
✓ Critic Approved
✓ Source Verified

This will make the generated content look much more professional and trustworthy.

---

# 13. FINAL QUALITY STANDARD

Before publishing, the system must ask:

"Would this look credible if posted by a professional AI Security researcher on LinkedIn or X?"

If the answer is NO:

→ Rewrite.

The final content must be:

**Professional**
**Knowledgeable**
**Fact-based**
**Technically accurate**
**Easy to understand**
**Well structured**
**150–220 words**
**Non-repetitive**
**Useful to the reader**

Do not publish content simply because it is grammatically correct.

Publish only when it provides genuine **AI Security insight and practical value**.

---

# IMPLEMENTATION

Update the existing:

* Writer Prompt
* Fact Checker Prompt
* Critic Prompt
* Rewrite Prompt
* Content validation logic

Do not create a separate fake content-generation system.

Integrate these rules into the existing autonomous publishing pipeline.

After implementation, test the system with multiple AI Security topics and verify that every generated post follows the required structure and word limit.
