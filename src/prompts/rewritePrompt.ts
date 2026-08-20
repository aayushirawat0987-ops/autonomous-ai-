import { DiscoveredTopic, GeneratedPost, Persona } from '../models/types';

export function getRewritePrompt(
  persona: Persona,
  topic: DiscoveredTopic,
  post: GeneratedPost,
  issues: string[],
  suggestions: string[]
): string {
  const words = post.content ? post.content.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const isTooShort = words < 250;
  const isTooLong = words > 300;

  let lengthGuidance = 'Maintain word count strictly between 250 and 300 words (Target: 260-290 words).';
  if (isTooShort) {
    lengthGuidance = `PREVIOUS DRAFT WAS TOO SHORT (${words} words). You MUST expand the post to reach at least 250-290 words by adding:
- Detailed technical explanation of mechanisms, architecture, trade-offs, and advantages/limitations of "${topic.title}".
- Concrete real-world use cases, practical business impact, and developer considerations.
- Clear, actionable technical takeaways without adding generic filler.`;
  } else if (isTooLong) {
    lengthGuidance = `PREVIOUS DRAFT WAS TOO LONG (${words} words). You MUST shorten the post to reach 250-290 words by removing:
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
Your previous draft was flagged by the Fact-Checker, Critic, or Topic Relevance Engine. You must resolve all feedback while strictly adhering to the 250–300 word count limit, Universal Topic Grounding, and zero generic filler.

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
1. WEAK TECHNICAL DEPTH / SHORT LENGTH: Add a clear technical explanation of the underlying technology (MUST be 250-300 words total).
2. NO USER QUERY MISUSE: Never use the entire user query phrase as the technology name (e.g. write "Blockchain can provide..." NOT "Analyzing advantage of block chain..."). Explain the core technology directly in WHAT IT IS.
3. TOO GENERIC / FILLER: Replace broad placeholder statements ("recent disclosures regarding...", "optimizing execution pathways...") with verified topic-specific facts.
4. BUSINESS IMPACT / ADVANTAGES: When intent is advantages/benefits/business value, discuss real benefits AND limitations (e.g. for Blockchain: shared records, auditability, smart contracts vs scalability, transaction costs, governance).
5. CASE STUDY / CONTENT TYPE RULE: If Content Type is "Case Study", article MUST contain actual case-study analysis of a real source/company. DO NOT use generic introductory filler ("recent disclosures regarding...", "Recent technical analysis published by..."). The opening MUST immediately explain the topic directly. NEVER use placeholders ("Technical Topic Request", "Technical Request", "[topic]", "[source]", "[company]").
6. REPETITIVE / CANNED CONCLUSION: Replace generic conclusions ("stay vigilant", "prioritize security") with a topic-specific concluding insight. Compare sections to eliminate duplicate ideas.
7. SUBTOPIC / USE OF X IN Y: When query is "Use of X in Y" (e.g. Python in Blockchain), DO NOT treat entire phrase as technology name. Distinguish between programming language X (Web3.py, RPC APIs, testing) and protocol Y (consensus, block hashing).
8. NO INTERNAL SYSTEM TEXT: Remove any "User Manual Request", "Manual post generation request", "The user asked...", or developer metadata.

STRICT WORD COUNT INSTRUCTION:
${lengthGuidance}
The final revised post MUST contain strictly between 250 and 300 words total.

Return strictly raw JSON matching this schema:
{
  "title": "string (Revised headline about ${topic.title})",
  "content": "string (Revised complete post content focused strictly on ${topic.title}, STRICTLY BETWEEN 250 AND 300 WORDS)",
  "contentAngle": "${post.contentAngle || 'Technical Explanation'}",
  "rationale": "string (Explanation of revisions made)",
  "whySelected": "string",
  "whyRelevantNow": "string",
  "sources": ["${topic.url}"]
}`;
}
