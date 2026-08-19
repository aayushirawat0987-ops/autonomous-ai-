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
- Detailed technical explanation of "${topic.title}".
- Concrete real-world impact on developers, systems, and performance.
- Important operational context, developer perspective, and key takeaways.`;
  } else if (isTooLong) {
    lengthGuidance = `PREVIOUS DRAFT WAS TOO LONG (${words} words). You MUST shorten the post to reach 200-260 words by removing:
- Repeated information, generic intros ("AI is evolving..."), and redundant filler sentences.
- Unnecessary adjectives and repeated conclusions. (Retain all core technical & factual details).`;
  }

  const hasTopicDrift = issues.some(i => i.toLowerCase().includes('drift') || i.toLowerCase().includes('topic'));
  let topicDriftGuidance = '';
  if (hasTopicDrift) {
    topicDriftGuidance = `TOPIC DRIFT DETECTED IN PREVIOUS DRAFT!
The previous draft drifted away to discuss default agent domain topics (such as prompt injection, LLM security, or generic cybersecurity).
YOU MUST RE-GROUND THIS ENTIRE POST STRICTLY AROUND "${topic.title}".
Every single paragraph must directly explain, analyze, or provide useful insights about "${topic.title}".`;
  }

  return `You are a senior technology writer revising a technical post.
Your previous draft was flagged by the Fact-Checker, Critic, or Topic Relevance Engine. You must resolve all feedback while strictly adhering to the 200–300 word count limit and Universal Topic Grounding.

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

STRICT REWRITE MANDATES:
1. UNIVERSAL TOPIC GROUNDING:
The requested topic "${topic.title}" MUST be the primary subject of the revised post.
Do NOT replace "${topic.title}" with prompt injection, LLM security, or generic cybersecurity unless the topic itself is about those subjects.

2. ZERO INTERNAL SYSTEM TEXT:
NEVER expose internal system text ("User Manual Request", "Manual post generation request", "The user asked...", "As requested by prompt..."). All text must be clean and publication-ready.

3. WORD COUNT INSTRUCTION:
${lengthGuidance}
The final revised post MUST contain strictly between 200 and 300 words total.

4. LOGICAL FLOW STRUCTURE:
- Hook (20-40 words): Specific & informative opening about "${topic.title}".
- What Is It / What Happened (40-60 words): Clear explanation of research/technology.
- Technical Explanation (50-80 words): Simple, professional English explaining technical mechanics of "${topic.title}".
- Why It Matters (40-60 words): Practical impact on systems, developers, and infrastructure.
- Key Takeaway (20-40 words): Actionable conclusion.
- Source Link (${topic.url}).
- Hashtags: 3-5 relevant hashtags.

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
