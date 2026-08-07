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
