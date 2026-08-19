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

  let lengthGuidance = 'Maintain word count strictly between 200 and 300 words (Target: 230-260 words).';
  if (isTooShort) {
    lengthGuidance = `PREVIOUS DRAFT WAS TOO SHORT (${words} words). You MUST expand the post to reach at least 200-260 words by adding:
- Detailed technical explanation of the underlying security mechanism.
- Concrete real-world impact on developers and enterprise architecture.
- Important operational context, developer perspective, and key takeaways.`;
  } else if (isTooLong) {
    lengthGuidance = `PREVIOUS DRAFT WAS TOO LONG (${words} words). You MUST shorten the post to reach 200-260 words by removing:
- Repeated information, generic intros ("AI is evolving..."), and redundant filler sentences.
- Unnecessary adjectives and repeated conclusions. (Retain all core technical & factual details).`;
  }

  return `You are a senior AI Security Researcher revising a technical post.
Your previous draft was flagged by the Fact-Checker or Critic. You must resolve all feedback while strictly adhering to the 200–300 word count limit and professional logical flow.

Persona: ${persona.name} (${persona.domain})
Style: ${persona.style}
Assigned Content Angle: ${post.contentAngle || 'Technical Explanation'}

Original Topic: ${topic.title}
Topic Summary: ${topic.summary}

Previous Draft Title: ${post.title}
Previous Draft Content (Previous Word Count: ${words} words):
${post.content}

FEEDBACK TO RESOLVE:
Issues / Flagged Items:
${issues.map(i => '- ' + i).join('\n')}

Suggestions / Corrections:
${suggestions.map(s => '- ' + s).join('\n')}

STRICT REWRITE MANDATES:
1. WORD COUNT INSTRUCTION:
${lengthGuidance}
The final revised post MUST contain strictly between 200 and 300 words total.

2. LOGICAL FLOW STRUCTURE:
- Hook (20-40 words): Specific & informative, avoid generic statements.
- What Happened / What Is It (40-60 words): Clear explanation of research/vulnerability.
- Technical Explanation (50-80 words): Simple, professional English explaining technical mechanics.
- Why It Matters (40-60 words): Security, developer, and infrastructure impact.
- Key Takeaway (20-40 words): Actionable conclusion.
- Source Link (${topic.url}).
- Hashtags: 3-5 relevant hashtags.

3. ACCURACY & KNOWLEDGE DENSITY:
- Fix any unsupported claims or factual errors. Do not invent stats or quotes.
- Preserve technical knowledge density while keeping language clear and readable.

Return strictly raw JSON matching this schema:
{
  "title": "string (Revised headline)",
  "content": "string (Revised complete post content, STRICTLY 200–300 words)",
  "contentAngle": "${post.contentAngle || 'Technical Explanation'}",
  "rationale": "string (Explanation of revisions made)",
  "whySelected": "string",
  "whyRelevantNow": "string",
  "sources": ["${topic.url}"]
}`;
}
