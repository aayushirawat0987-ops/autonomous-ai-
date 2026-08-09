import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getCriticPrompt(persona: Persona, topic: DiscoveredTopic, post: GeneratedPost): string {
  const words = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  return `You are a critical Content Evaluator for an AI Security publishing agent.
Your job is to evaluate the quality of a generated post based on strict criteria.

Persona: ${persona.name} (${persona.domain})
Style: ${persona.style}

Original Topic: ${topic.title}
Original Summary: ${topic.summary}

Generated Post Content (Current Word Count: ${words} words):
${post.content}

EVALUATION WEIGHTINGS & CATEGORIES (Score each 0-100):
1. Accuracy (25% weight): Is all information supported by verified sources? Zero fake CVEs, dates, or statements?
2. Technical Knowledge (20% weight): Does it explain the security mechanism accurately in clear, natural language?
3. Relevance (20% weight): Does it directly focus on AI Security / LLM threat vectors?
4. Readability (15% weight): Are sentences concise (10-25 words), paragraphs short, and flow engaging?
5. Professionalism (10% weight): Does it sound like a senior AI Security researcher explaining a complex topic clearly? No clickbait, no generic chatbot language.
6. Structure (10% weight): Does it follow the 7 sections (Hook, What Happened, Why It Matters, Technical Breakdown, 3 Security Takeaways starting with '•', Conclusion, Hashtags) AND fall strictly between 150 and 220 words?

OVERALL SCORE RULE:
Calculate overallScore using the weighted percentage formula above.
The overall score MUST be >= 80 to pass.
NOTE: If word count is < 150 or > 220 words (current count: ${words}), cap overallScore at 75 maximum.

Return a JSON object with:
- "passed" (boolean): true ONLY if overallScore >= 80.
- "scores" (object): containing relevance, originality, clarity, engagement, factualQuality, safety, overallScore (all numbers 0-100).
- "weaknesses" (string[]): array of specific weaknesses or areas for improvement.
- "improvementSuggestions" (string[]): actionable guidance to fix issues and reach score >= 80.

Output strictly raw JSON.`;
}
