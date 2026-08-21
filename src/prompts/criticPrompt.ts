import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getCriticPrompt(persona: Persona, topic: DiscoveredTopic, post: GeneratedPost): string {
  const words = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  return `You are an expert Critic and Quality Evaluator for an autonomous technology publishing platform.
Your job is to evaluate the quality of a generated post based on strict 7-metric criteria, Usefulness Test, zero generic filler, and word count compliance (STRICTLY 150 TO 300 WORDS).
Before publishing, you must run an internal editorial-quality check. Reject the content if it is under 150 words when sufficient information exists, is too generic, lacks technical details, paraphrases the intro, makes unsupported claims, repeats the same idea, or lacks explanation of why it matters. Regenerate if quality is below 8/10 (overallScore < 80).

Persona: ${persona.name} (${persona.domain})
Requested Topic: ${topic.title}
Assigned Content Angle: ${post.contentAngle || 'Technical Explanation'}

Generated Post Content (Current Word Count: ${words} words):
${post.content}

CRITICAL USEFULNESS & CONTENT QUALITY AUDIT:
1. Does this post actually teach the reader something concrete about "${topic.title}"? (What does the reader know after reading this that they did not know before?)
2. Is the technical information specific, factual, and human-sounding rather than generic AI-generated filler?
3. Does it avoid formulaic AI clichés ("In today's rapidly evolving world", "This is a game changer", "The future is here", "Organizations must stay vigilant", "recent technical analysis", "significant progress", "emerging technology systems") and repetitive buzzwords?
4. Is the structure tailored to "${topic.title}" rather than a fixed copied template?
5. Does the conclusion provide a topic-specific insight rather than a generic security warning?
6. Are there any hallucination risks? Ensure no invented research, statistics, companies, findings, or technical claims. Verify source relevance.

STRICT 7-METRIC EVALUATION CATEGORIES (Score each 0 to 100):
1. Specificity (15% weight): Is the technical information specific rather than generic?
2. Technical Depth (15% weight): Does it explain the important technical details and how it works?
3. Factual Grounding (20% weight): Are all claims supported by the source without fabrication?
4. Novelty (15% weight): Does it explain what is genuinely new?
5. Practical Usefulness (15% weight): Is there a clear explanation of why it matters and a practical takeaway?
6. Readability (10% weight): Is it easy to read without AI buzzwords?
7. Source Confidence (10% weight): Does the content confidently reflect the source material without guessing?

WORD COUNT & PASSING RULES:
Current word count: ${words} words.
- If topic drift occurred, cap overallScore at 65 maximum and flag topic drift.
- If generic filler or AI clichés are present, cap overallScore at 75 maximum.
- If word count is < 150 words or > 300 words, cap overallScore at 75 maximum and flag word count violation.
- To PASS: overallScore >= 80, factualGrounding >= 90, novelty >= 80, sourceConfidence >= 80, zero topic drift, zero generic filler, and word count MUST be strictly 150–300 words.

Return strictly raw JSON matching this schema:
{
  "passed": boolean,
  "scores": {
    "specificity": number (0-100),
    "technicalDepth": number (0-100),
    "factualGrounding": number (0-100),
    "novelty": number (0-100),
    "practicalUsefulness": number (0-100),
    "readability": number (0-100),
    "sourceConfidence": number (0-100),
    "overallScore": number (weighted average 0-100)
  },
  "topicDrift": boolean,
  "weaknesses": ["string array of specific weaknesses found"],
  "improvementSuggestions": ["string array of concrete actionable recommendations to fix problems"]
}`;
}
