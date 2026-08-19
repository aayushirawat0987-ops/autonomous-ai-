import { DiscoveredTopic, Persona } from '../models/types';
import { getPersonaSystemPrompt } from './personaPrompt';

export function getEditorialEvaluationPrompt(persona: Persona, topic: DiscoveredTopic, memorySummaries: string[]): string {
  const personaContext = getPersonaSystemPrompt(persona);

  return `${personaContext}

EDITORIAL SCORING TASK:
Evaluate the following candidate topic on a scale of 0 to 100 for overall technical relevance, novelty, impact, timeliness, and duplicate status.

Topic Details:
- Title: ${topic.title}
- Source: ${topic.source}
- URL: ${topic.url}
- Summary: ${topic.summary}
- Published At: ${topic.publishedAt}

Recent Memory (Topics already covered):
${memorySummaries.length > 0 ? memorySummaries.map(s => `- ${s}`).join('\n') : 'None yet.'}

SCORING DIRECTIVES:
1. Technical Relevance (relevance): How meaningful is this topic for engineers, developers, researchers, or technical leaders? (0-100)
2. Novelty (novelty): Is this a fresh technical disclosure, research finding, release, tool, or breakthrough? (0-100)
3. Impact (impact): Does this topic have practical technical value or architectural consequences? (0-100)
4. Timeliness (timeliness): Is this fresh and active? (0-100)
5. Duplicate Score (duplicateScore): 0 = unique, 100 = duplicate (0-100). REJECT if duplicateScore >= 30.

Aggregate totalScore MUST BE STRICTLY GREATER THAN 80 to pass (totalScore > 80).

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
