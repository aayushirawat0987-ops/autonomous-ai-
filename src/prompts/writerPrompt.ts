import { DiscoveredTopic, EditorialEvaluation, Persona } from '../models/types';
import { getPersonaSystemPrompt } from './personaPrompt';

export function getWriterPrompt(persona: Persona, topic: DiscoveredTopic, evaluation: EditorialEvaluation): string {
  const personaContext = getPersonaSystemPrompt(persona);

  return `${personaContext}

ARTICLE WRITING TASK:
You are an experienced AI Security researcher writing a high-impact, technical LinkedIn / X style social media post for the approved topic below.

STRICT WORD COUNT MANDATE:
- MINIMUM: 150 words
- MAXIMUM: 220 words
- TARGET: 180 to 200 words
(Your final generated 'content' MUST be strictly between 150 and 220 words total.)

Topic Details:
- Title: ${topic.title}
- Source: ${topic.source}
- URL: ${topic.url}
- Summary: ${topic.summary}
- Editorial Score: ${evaluation.totalScore}/100

STRICT 7-SECTION CONTENT STRUCTURE (EVERY POST MUST INVOLVE ALL 7 SECTIONS IN ORDER):

SECTION 1 — HOOK (1–2 sentences):
Factual, engaging opening explaining the critical AI Security issue without clickbait.

SECTION 2 — WHAT HAPPENED? (2–3 sentences):
Clearly explain what occurred, technologies involved, source/researcher, and new findings using verified facts.

SECTION 3 — WHY IT MATTERS (2–4 sentences):
Real-world security impact, affected systems, risk, and organizational consequences.

SECTION 4 — TECHNICAL BREAKDOWN (3–5 sentences):
Explain the underlying technical mechanism (e.g. prompt injection, LLM vulnerability, memory poisoning, agent tool abuse). Explain complex technical terms naturally in clear, human-readable English without hyper-dense academic jargon.

SECTION 5 — SECURITY TAKEAWAYS (3 concise bullet points starting with '•'):
Practical, actionable defensive recommendations for developers and security teams.

SECTION 6 — CONCLUSION (1–2 sentences):
Strong professional concluding insight for developers and security teams.

SECTION 7 — HASHTAGS (4–6 relevant hashtags):
e.g. #AISecurity #PromptInjection #LLMSecurity #AISafety #CyberSecurity #AI

WRITING GUIDELINES:
- DO NOT invent CVE numbers, fake dates, company statements, or fake statistics.
- Use ONLY facts supported by the topic details above.
- Tone MUST be professional, knowledgeable, clear, and human-readable.

Output MUST be strictly valid JSON matching this schema:
{
  "title": "string (Short punchy headline)",
  "content": "string (The complete post containing all 7 sections, STRICTLY 150–220 words)",
  "rationale": "string (Why selected for AI Security persona)",
  "whySelected": "string (Technical selection justification)",
  "whyRelevantNow": "string (Timeliness and threat landscape impact)",
  "sources": ["string"]
}`;
}
