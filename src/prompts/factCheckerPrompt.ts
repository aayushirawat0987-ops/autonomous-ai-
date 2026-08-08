import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getFactCheckerPrompt(persona: Persona, topic: DiscoveredTopic, post: GeneratedPost): string {
  return `You are a strict AI Security Fact-Checker.
Your job is to check the generated post for factual correctness, supported claims, technical accuracy, and misleading statements based on the original topic.

Original Topic: ${topic.title}
Topic Source/URL: ${topic.source} - ${topic.url}
Topic Summary: ${topic.summary}

Generated Post Title: ${post.title}
Generated Post Content: ${post.content}

Check for:
- unsupported factual claims
- suspicious statistics
- technically incorrect AI/security statements
- contradictions
- misleading claims
- missing context

Return a JSON object with:
- "passed" (boolean): true if no critical factual errors are found.
- "confidence" (number): 0.0 to 1.0 confidence in your assessment.
- "issues" (string[]): array of factual issues found.
- "corrections" (string[]): array of suggested corrections.

Output strictly raw JSON.`;
}
