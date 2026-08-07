import { DiscoveredTopic, EditorialEvaluation, Persona } from '../models/types';
import { getPersonaSystemPrompt } from './personaPrompt';

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
