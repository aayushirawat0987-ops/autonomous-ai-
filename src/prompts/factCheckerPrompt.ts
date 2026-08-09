import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getFactCheckerPrompt(persona: Persona, topic: DiscoveredTopic, post: GeneratedPost): string {
  const words = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  return `You are a strict AI Security Fact-Checker and Content Auditor.
Your job is to check the generated post for factual correctness, supported claims, zero hallucinations, technical accuracy, and word count compliance (STRICTLY 150 TO 220 WORDS).

Original Topic: ${topic.title}
Topic Source/URL: ${topic.source} - ${topic.url}
Topic Summary: ${topic.summary}

Generated Post Title: ${post.title}
Generated Post Content (Current Word Count: ${words} words):
${post.content}

STRICT VERIFICATION CRITERIA:
1. Fact Check & Zero Hallucinations: Are all claims, stats, and disclosures supported by the topic summary? FAIL if the writer invented fake CVEs, fake dates, fake quotes, or unverified claims.
2. Technical Accuracy: Is the security mechanism explanation technically accurate?
3. Word Count Check: Is the post strictly between 150 and 220 words? (Current count: ${words} words. FAIL if < 150 or > 220 words).
4. Structure Check: Does the post follow the 7 sections (Hook, What Happened, Why It Matters, Technical Breakdown, 3 Security Takeaways starting with '•', Conclusion, Hashtags)?

Return a JSON object with:
- "passed" (boolean): true ONLY if factually supported, technically correct, AND word count is between 150 and 220 words.
- "confidence" (number): 0.0 to 1.0 confidence in assessment.
- "issues" (string[]): array of factual issues, hallucinations, or word count violations found.
- "corrections" (string[]): array of suggested corrections (e.g. "Expand technical breakdown to reach 150 words" or "Shorten text to stay under 220 words").

Output strictly raw JSON.`;
}
