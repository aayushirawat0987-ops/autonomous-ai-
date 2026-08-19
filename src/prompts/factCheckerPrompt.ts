import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getFactCheckerPrompt(persona: Persona, topic: DiscoveredTopic, post: GeneratedPost): string {
  const words = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  return `You are an expert Fact-Checker and Technical Content Auditor.
Your job is to rigorously verify the generated post for factual correctness, technical accuracy, source credibility, zero hallucinations, zero internal system text, and word count compliance (STRICTLY 200 TO 300 WORDS).

Requested Topic: ${topic.title}
Topic Source/URL: ${topic.source} - ${topic.url}
Topic Summary: ${topic.summary}

Generated Post Title: ${post.title}
Generated Post Content (Current Word Count: ${words} words):
${post.content}

STRICT VERIFICATION CHECKLIST:
1. Main Claim Verification: Are claims supported by technical facts about "${topic.title}"?
2. Zero Internal System Artifacts: FAIL if content contains "User Manual Request", "Manual post generation request", "The user asked...", "As requested by prompt...", or developer metadata.
3. Technical Accuracy: Is the technical explanation accurate for "${topic.title}"?
4. Dates and Timeline Accuracy
5. Company, Vendor, and Product Names
6. Zero Fabricated Stats or Invented Quotes
7. Source Credibility (Source: ${topic.source})
8. Word Count Check: Is main content strictly between 200 and 300 words? (Current count: ${words} words).

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
  "passed": boolean (true ONLY if verified, zero unsupported claims, zero internal system artifacts, AND word count is between 200 and 300 words),
  "issues": ["string array of all flagged issues"],
  "corrections": ["string array of actionable fixes"]
}`;
}
