import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getRewritePrompt(
  persona: Persona,
  topic: DiscoveredTopic,
  post: GeneratedPost,
  issues: string[],
  suggestions: string[]
): string {
  const words = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const isTooShort = words < 200;
  const isTooLong = words > 300;

  let lengthGuidance = 'Maintain word count strictly between 200 and 300 words (Target: 230-270 words).';
  if (isTooShort) {
    lengthGuidance = `PREVIOUS DRAFT WAS TOO SHORT (${words} words). You MUST expand the post to reach at least 200-270 words by adding:
- Detailed technical explanation of the underlying mechanism of "${topic.title}".
- Concrete real-world use cases, practical impact, and developer considerations.
- Clear technical takeaways without adding generic filler.`;
  } else if (isTooLong) {
    lengthGuidance = `PREVIOUS DRAFT WAS TOO LONG (${words} words). You MUST shorten the post to reach 200-270 words by removing:
- Repeated information, AI clichés ("In today's rapidly evolving world..."), and redundant filler sentences.
- Unnecessary adjectives and canned conclusions (e.g. "stay vigilant"). Retain all core technical & factual details.`;
  }

  const hasTopicDrift = issues.some(i => i.toLowerCase().includes('drift') || i.toLowerCase().includes('topic'));
  let topicDriftGuidance = '';
  if (hasTopicDrift) {
    topicDriftGuidance = `TOPIC DRIFT DETECTED IN PREVIOUS DRAFT!
The previous draft drifted away to discuss default agent domain topics (such as prompt injection, LLM security, or generic cybersecurity).
YOU MUST RE-GROUND THIS ENTIRE POST STRICTLY AROUND "${topic.title}".
Every single paragraph must directly explain, analyze, or provide useful insights about "${topic.title}".`;
  }

  return `You are a senior technology researcher and writer revising a technical post.
Your previous draft was flagged by the Fact-Checker, Critic, or Topic Relevance Engine. You must resolve all feedback while strictly adhering to the 200–300 word count limit, Universal Topic Grounding, and zero generic filler.

Requested Topic: ${topic.title}
Persona: ${persona.name} (${persona.domain})
Assigned Content Angle: ${post.contentAngle || 'Technical Explanation'}

Original Topic Summary: ${topic.summary}

Previous Draft Title: ${post.title}
Previous Draft Content (Previous Word Count: ${words} words):
${post.content}

FEEDBACK TO RESOLVE:
Issues / Flagged Items:
${issues.map(i => '- ' + i).join('\n')}

Suggestions / Corrections:
${suggestions.map(s => '- ' + s).join('\n')}

${topicDriftGuidance}

TARGETED REWRITE RULES:
1. WEAK TECHNICAL DEPTH: Add a clear technical explanation of the underlying technology.
2. TOO GENERIC / FILLER: Replace broad placeholder statements ("recent disclosures regarding...", "as technology evolves...") with verified specifics.
3. REPETITIVE / CANNED CONCLUSION: Replace generic conclusions ("stay vigilant", "prioritize security") with a topic-specific concluding insight.
4. NO INTERNAL SYSTEM TEXT: Remove any "User Manual Request", "Manual post generation request", "The user asked...", or developer metadata.

STRICT WORD COUNT INSTRUCTION:
${lengthGuidance}
The final revised post MUST contain strictly between 200 and 300 words total.

Return strictly raw JSON matching this schema:
{
  "title": "string (Revised headline about ${topic.title})",
  "content": "string (Revised complete post content focused strictly on ${topic.title}, STRICTLY 200–300 words)",
  "contentAngle": "${post.contentAngle || 'Technical Explanation'}",
  "rationale": "string (Explanation of revisions made)",
  "whySelected": "string",
  "whyRelevantNow": "string",
  "sources": ["${topic.url}"]
}`;
}
