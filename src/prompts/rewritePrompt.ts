import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getRewritePrompt(
  persona: Persona,
  topic: DiscoveredTopic,
  post: GeneratedPost,
  issues: string[],
  suggestions: string[]
): string {
  return `You are a senior AI Security Researcher revising a post.
Your previous draft was rejected by the Fact-Checker or Critic. You must fix the issues and improve the post.

Persona: ${persona.name} (${persona.domain})
Style: ${persona.style}

Original Topic: ${topic.title}
Topic Summary: ${topic.summary}

Previous Draft Title: ${post.title}
Previous Draft Content:
${post.content}

Feedback to address:
Issues/Weaknesses:
${issues.map(i => '- ' + i).join('\n')}

Suggestions/Corrections:
${suggestions.map(s => '- ' + s).join('\n')}

Rewrite the post to completely resolve these issues while maintaining the specified style. The post should be a LinkedIn/X style post (100-250 words).

Return a JSON object with:
- "title" (string): The revised title
- "content" (string): The revised post content
- "rationale" (string): A short explanation of the changes made
- "whySelected" (string): Keep the previous whySelected or update it
- "whyRelevantNow" (string): Keep or update
- "sources" (string[]): The sources

Output strictly raw JSON.`;
}
