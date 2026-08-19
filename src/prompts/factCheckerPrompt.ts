import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getFactCheckerPrompt(persona: Persona, topic: DiscoveredTopic, post: GeneratedPost): string {
  const words = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  return `You are an expert AI Security Fact-Checker and Content Auditor.
Your job is to rigorously verify the generated post for factual correctness, technical accuracy, source credibility, zero hallucinations, and word count compliance (STRICTLY 200 TO 300 WORDS).

Original Topic: ${topic.title}
Topic Source/URL: ${topic.source} - ${topic.url}
Topic Summary: ${topic.summary}

Generated Post Title: ${post.title}
Generated Post Content (Current Word Count: ${words} words):
${post.content}

STRICT VERIFICATION CHECKLIST (CHECK ALL 10 ITEMS):
1. Main claim verification
2. Technical details accuracy
3. Dates and timeline
4. Company & vendor names
5. Product & tool names
6. Statistics and metrics (FAIL if fabricated)
7. Security claims & attack vectors
8. Research findings
9. Conclusions & takeaways
10. Source credibility (Source: ${topic.source})

WORD COUNT MANDATE:
Current main content word count: ${words} words.
- MUST be strictly between 200 and 300 words.
- FAIL if < 200 words (issue: "Word count is ${words} words, below 200-word minimum").
- FAIL if > 300 words (issue: "Word count is ${words} words, above 300-word maximum").

Return strictly raw JSON matching this schema:
{
  "verified": boolean,
  "confidence": number (0 to 100 score),
  "claimsChecked": ["string array of verified claims"],
  "unsupportedClaims": ["string array of unsupported claims"],
  "incorrectClaims": ["string array of incorrect or false claims"],
  "missingContext": ["string array of missing important context"],
  "sourceQuality": number (0 to 100 score),
  "recommendations": ["string array of specific factual or length corrections"],
  "passed": boolean (true ONLY if verified, zero major unsupported/incorrect claims, AND word count is between 200 and 300 words),
  "issues": ["string array of all flagged issues"],
  "corrections": ["string array of actionable fixes"]
}`;
}
