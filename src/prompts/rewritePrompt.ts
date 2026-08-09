import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getRewritePrompt(
  persona: Persona,
  topic: DiscoveredTopic,
  post: GeneratedPost,
  issues: string[],
  suggestions: string[]
): string {
  const words = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  return `You are a senior AI Security Researcher revising a post.
Your previous draft was rejected by the Fact-Checker or Critic. You must resolve all feedback while strictly adhering to the 150–220 word count limit and 7-section structure.

Persona: ${persona.name} (${persona.domain})
Style: ${persona.style}

Original Topic: ${topic.title}
Topic Summary: ${topic.summary}

Previous Draft Title: ${post.title}
Previous Draft Content (Previous Word Count: ${words} words):
${post.content}

FEEDBACK TO RESOLVE:
Issues/Weaknesses:
${issues.map(i => '- ' + i).join('\n')}

Suggestions/Corrections:
${suggestions.map(s => '- ' + s).join('\n')}

STRICT REWRITE MANDATES:
1. WORD COUNT: The revised post MUST be strictly between 150 and 220 words (Target: 180-200 words). If previous count was < 150 words, expand technical explanations naturally. If > 220 words, tighten text concisely.
2. STRUCTURE: Maintain the 7 sections in order (SECTION 1 — HOOK, SECTION 2 — WHAT HAPPENED?, SECTION 3 — WHY IT MATTERS, SECTION 4 — TECHNICAL BREAKDOWN, SECTION 5 — SECURITY TAKEAWAYS with 3 '•' bullets, SECTION 6 — CONCLUSION, SECTION 7 — HASHTAGS).
3. FACT CHECKING: Rely strictly on verified facts from the topic summary. Zero hallucinations.
4. TONE: Professional, knowledgeable, clear, human AI Security researcher tone.

Return a JSON object with:
- "title" (string): The revised title
- "content" (string): The revised post content (STRICTLY 150–220 words)
- "rationale" (string): A short explanation of the changes made
- "whySelected" (string): Keep the previous whySelected or update it
- "whyRelevantNow" (string): Keep or update
- "sources" (string[]): The sources

Output strictly raw JSON.`;
}
