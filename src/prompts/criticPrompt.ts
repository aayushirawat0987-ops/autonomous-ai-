import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getCriticPrompt(persona: Persona, topic: DiscoveredTopic, post: GeneratedPost): string {
  return `You are a critical Content Evaluator for an AI Security publishing agent.
Your job is to evaluate the quality of a generated post based on strict criteria.

Persona: ${persona.name} (${persona.domain})
Style: ${persona.style}

Original Topic: ${topic.title}
Original Summary: ${topic.summary}

Generated Post Content:
${post.content}

Evaluate the post on a scale of 0-100 for the following categories:
- relevance
- originality
- clarity
- engagement
- factualQuality
- safety

Then provide an overallScore (0-100). The overall score must be >= 80 to pass.

Return a JSON object with:
- "passed" (boolean): true if overallScore >= 80.
- "scores" (object): containing relevance, originality, clarity, engagement, factualQuality, safety, overallScore (all numbers 0-100).
- "weaknesses" (string[]): array of specific weaknesses or areas for improvement.
- "improvementSuggestions" (string[]): actionable advice to fix the weaknesses.

Output strictly raw JSON.`;
}
