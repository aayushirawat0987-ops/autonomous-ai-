import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getCriticPrompt(
  persona: Persona,
  topic: DiscoveredTopic,
  post: GeneratedPost,
  minWords: number = 500,
  maxWords: number = 700
): string {
  const words = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  return `You are an expert Critic and Quality Evaluator for an autonomous technology publishing platform.
Your job is to evaluate the quality of a generated post based on strict 8-metric criteria, Usefulness Test, zero generic filler, and word count compliance (STRICTLY ${minWords} TO ${maxWords} WORDS).
Before publishing, you must verify source relevance, factual accuracy, specificity, readability, and hallucination risk. Regenerate if quality is below 8/10 (overallScore < 80) or if word count is outside ${minWords}-${maxWords} words.

Persona: ${persona.name} (${persona.domain})
Requested Topic: ${topic.title}
Assigned Content Angle: ${post.contentAngle || 'Technical Explanation'}

Generated Post Content (Current Word Count: ${words} words):
${post.content}

CRITICAL USEFULNESS & CONTENT QUALITY AUDIT:
1. Does this post actually teach the reader something concrete about "${topic.title}"? (What does the reader know after reading this that they did not know before?)
2. Is the technical information specific, factual, and human-sounding rather than generic AI-generated filler?
3. Does it avoid formulaic AI clichés ("In today's rapidly evolving world", "This is a game changer", "The future is here", "Organizations must stay vigilant", "recent technical analysis", "significant progress", "emerging technology systems", "recent disclosures regarding", "technical topic request") and repetitive buzzwords?
4. Is the structure tailored to "${topic.title}" rather than a fixed copied template?
5. Does the conclusion provide a topic-specific insight rather than a generic security warning?
6. Are there any hallucination risks? Ensure no invented research, statistics, companies, findings, or technical claims. Verify source relevance.
7. CASE STUDY & PLACEHOLDER RULE: If the post is a Case Study, does it contain actual case-study analysis of a real source/company/implementation? Ensure it DOES NOT use generic introductory filler ("recent disclosures regarding...", "Recent technical analysis published by...", "Technical Topic Request...", "Technical overview and analysis...", "significant progress regarding...") or placeholder text ('[topic]', '[source]', '[company]', 'Technical Topic Request'). The opening MUST explain the topic directly.

STRICT 8-METRIC EVALUATION CATEGORIES (Score each 0 to 100):
1. Accuracy (25% weight): Zero false claims, zero fabricated stats/CVEs/quotes. Every detail verified.
2. Clarity (15% weight): Simple, clear, professional English. Easy for a technical beginner to read.
3. Technical Knowledge (15% weight): Concrete technical mechanism explanation of "${topic.title}". High knowledge density.
4. Originality (15% weight): Unique hook, distinct perspective, non-repetitive phrasing, novel angle.
5. Usefulness (10% weight): Teaches the reader something practical and actionable about "${topic.title}".
6. Evidence Quality (10% weight): Supported by trustworthy sources and clear attribution.
7. Structure (5% weight): Topic-tailored logical flow with high scannability.
8. Readability (5% weight): Engaging sentence flow, concise paragraphs. Zero internal system text ("User Manual Request", etc.).

WORD COUNT & PASSING RULES:
Current word count: ${words} words.
- If topic drift occurred, cap overallScore at 65 maximum and flag topic drift.
- If generic filler or AI clichés are present, cap overallScore at 75 maximum.
- If word count is < ${minWords} words or > ${maxWords} words, cap overallScore at 70 maximum and flag word count violation (PREVIOUS DRAFT WAS OUTSIDE WORD COUNT BOUNDS: MUST BE STRICTLY ${minWords}-${maxWords} WORDS).
- To PASS: overallScore >= 80, accuracy >= 90, originality >= 80, evidenceQuality >= 80, zero topic drift, zero generic filler, and word count MUST be strictly ${minWords}–${maxWords} words.

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
