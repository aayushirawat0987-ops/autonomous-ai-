import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getCriticPrompt(persona: Persona, topic: DiscoveredTopic, post: GeneratedPost): string {
  const words = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  return `You are an expert Critic and Quality Evaluator for an autonomous technology publishing platform.
Your job is to evaluate the quality of a generated post based on strict 8-metric criteria, Topic Grounding, zero internal text, and word count compliance (STRICTLY 200 TO 300 WORDS).

Persona: ${persona.name} (${persona.domain})
Requested Topic: ${topic.title}
Assigned Content Angle: ${post.contentAngle || 'Technical Explanation'}

Generated Post Content (Current Word Count: ${words} words):
${post.content}

CRITICAL TOPIC-GROUNDING CHECK:
1. Is "${topic.title}" the PRIMARY SUBJECT of this post?
2. Main Subject Test: If the title were removed, would a reader still immediately know the post is about "${topic.title}"?
3. Topic Drift Warning: Did the writer drift away from "${topic.title}" to force default agent domain topics (e.g., prompt injection, LLM security, generic cybersecurity)? If YES, FAIL this check and flag severe Topic Drift.

STRICT 8-METRIC EVALUATION CATEGORIES (Score each 0 to 100):
1. Accuracy (25% weight): Zero false claims, zero fabricated stats/CVEs/quotes. Every detail verified.
2. Clarity (15% weight): Simple, clear, professional English. Easy for a technical beginner to read.
3. Technical Knowledge (15% weight): Concrete technical mechanism explanation of "${topic.title}". High knowledge density.
4. Originality (15% weight): Unique hook, distinct perspective, non-repetitive phrasing, novel angle.
5. Usefulness (10% weight): Teaches the reader something practical and actionable about "${topic.title}".
6. Evidence Quality (10% weight): Supported by trustworthy sources and clear attribution.
7. Structure (5% weight): Clear logical flow (Hook -> What Happened/Is It -> Tech Explanation -> Why It Matters -> Key Takeaway -> Source -> 3-5 Hashtags).
8. Readability (5% weight): Engaging sentence flow, concise paragraphs. Zero internal system text ("User Manual Request", etc.).

WORD COUNT & PASSING RULES:
Current word count: ${words} words.
- If topic drift occurred, cap overallScore at 65 maximum and flag topic drift.
- If word count is < 200 words or > 300 words, cap overallScore at 75 maximum and flag word count violation.
- To PASS: overallScore >= 85, accuracy >= 90, originality >= 80, evidenceQuality >= 80, zero topic drift, and word count MUST be strictly 200–300 words.

Return strictly raw JSON matching this schema:
{
  "passed": boolean,
  "scores": {
    "accuracy": number (0-100),
    "clarity": number (0-100),
    "technicalKnowledge": number (0-100),
    "originality": number (0-100),
    "usefulness": number (0-100),
    "evidenceQuality": number (0-100),
    "structure": number (0-100),
    "readability": number (0-100),
    "overallScore": number (weighted average 0-100)
  },
  "topicDrift": boolean,
  "weaknesses": ["string array of specific weaknesses found"],
  "improvementSuggestions": ["string array of concrete actionable recommendations to fix problems"]
}`;
}
