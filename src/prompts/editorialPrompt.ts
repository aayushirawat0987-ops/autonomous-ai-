import { DiscoveredTopic, Persona } from '../models/types';
import { getPersonaSystemPrompt } from './personaPrompt';

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

PRIMARY DOMAIN FOCUS MANDATE:
- Required Focus Domain: ${persona.domain}

CRITICAL REJECTION DIRECTIVES:
1. REJECT (relevance < 50) if the topic is NOT directly focused on ${persona.domain} or its core technical security vectors.
   - Example off-topic items to REJECT: general non-domain software updates, generic non-security AI news, robotics, weather, healthcare, finance, gaming, or generic benchmarks.
2. REJECT if duplicateScore >= 30 (already covered in memory).
3. Aggregate totalScore MUST BE STRICTLY GREATER THAN 80 to pass (totalScore > 80).

SCORING METRICS (0 to 100):
- relevance: How directly does this focus strictly on ${persona.domain}? (0-100)
- novelty: Is this a new finding, vulnerability, paper, tool, or disclosure in ${persona.domain}? (0-100)
- impact: Does this have major technical, security, or operational consequences? (0-100)
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
