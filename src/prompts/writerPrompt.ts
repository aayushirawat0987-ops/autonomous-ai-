import { DiscoveredTopic, EditorialEvaluation, Persona } from '../models/types';
import { getPersonaSystemPrompt } from './personaPrompt';
import { AntiRepetitionContext } from '../agent/memory';

export function getWriterPrompt(
  persona: Persona,
  topic: DiscoveredTopic,
  evaluation: EditorialEvaluation,
  contentAngle: string = 'Technical Explanation',
  antiRepetition?: AntiRepetitionContext,
  topicCategory: string = 'General Technology'
): string {
  const personaContext = getPersonaSystemPrompt(persona);

  const previousHooksStr = antiRepetition?.recentHooks?.length 
    ? antiRepetition.recentHooks.slice(0, 3).map(h => `  - "${h}"`).join('\n')
    : '  - None';

  const previousAnglesStr = antiRepetition?.recentAngles?.length
    ? antiRepetition.recentAngles.slice(0, 5).join(', ')
    : 'None';

  const isMisconception = contentAngle.toLowerCase().includes('misconception');
  let angleInstruction = `Assigned Content Angle: ${contentAngle}`;
  let structureInstruction = `1. WHAT HAPPENED?: Clearly identify the actual announcement, discovery, release, research result, vulnerability, product change, or development.
2. IMPORTANT TECHNICAL DETAILS: Include relevant models, technologies, architecture, algorithms, benchmarks, APIs, datasets, security mechanisms, performance numbers, versions, dates, or other concrete details available in the sources.
3. WHAT IS GENUINELY NEW: Explain how this differs from previous approaches, versions, competitors, or existing capabilities when reliable information is available.
4. WHY IT MATTERS: Explain the real technical, business, developer, research, security, or user impact.
5. WHO IS AFFECTED: Identify relevant developers, researchers, companies, security teams, users, or industries.
6. EVIDENCE: Provide concrete facts, numbers, benchmarks, source claims, dates, and direct technical findings. Never invent statistics or details.
7. LIMITATIONS AND CAVEATS: Include limitations, uncertainty, trade-offs, cost, availability restrictions, security concerns, or unresolved issues. Do not turn every topic into positive hype.
8. PRACTICAL TAKEAWAY: Explain what developers, engineers, researchers, or users should actually understand or do differently.
9. WHAT TO WATCH NEXT: Include meaningful future implications only when they can reasonably be derived from the available evidence. Clearly distinguish analysis/speculation from confirmed facts.`;

  if (isMisconception) {
    angleInstruction = `Assigned Content Angle: Common Misconception (Identify a genuine misconception about "${topic.title}", explain why it is wrong, provide verified factual evidence, and clarify the key takeaway).`;
  }

  return `${personaContext}

MANDATORY WRITER INSTRUCTION:
Make every post specific, factual, technical, and human-sounding, not generic AI-generated filler. Never invent research, statistics, companies, findings, or technical claims. Prioritize information density over word count. Avoid empty introductions and generic conclusions. Preserve important technical terminology from the source. Do not simply summarize the first paragraph of an article. The final result should feel like it was written by a technical AI news analyst/research editor.

UNIVERSAL TOPIC-GROUNDING MANDATE (CRITICAL RULE):
- Requested Topic: "${topic.title}"
- Topic Category: "${topicCategory}"
- Primary Subject: "${topic.title}"
- ${angleInstruction}

CRITICAL INSTRUCTION ON SUBJECT VS PERSONALITY:
The requested topic "${topic.title}" MUST be the PRIMARY SUBJECT of the entire post.
- Topic determines WHAT the post is about.
- Persona determines HOW it is written (analytical style, clear technical depth).
- Do NOT generate generic placeholder sentences ("recent disclosures regarding...", "as technology systems evolve across..."). Provide at least 3 verified topic-specific facts.

NO FORMULAIC AI CLICHÉS MANDATE:
NEVER use generic AI clichés, repetitive buzzwords, or filler phrases:
- DO NOT USE: "In today's rapidly evolving world", "This marks a significant milestone", "The future of AI is here", "As AI continues to transform", "This is a game changer", "The possibilities are endless", "It is important to note that", "In conclusion", "This highlights the importance of", "recent technical analysis", "significant progress", "emerging technology systems".
- DO NOT USE dramatic question hooks ("Did you know?", "What if?", "Imagine?", "Here's why").

NO INTERNAL SYSTEM TEXT MANDATE:
NEVER expose internal system text or generation metadata in your response or content body.
- NEVER write: "User Manual Request", "Manual post generation request", "The user asked...", "According to the prompt...", or "As requested...".

SOURCE INTELLIGENCE MANDATE:
Before generating the final content, analyze all available source material and identify:
- The primary event
- The strongest factual claims
- Important technical details
- Supporting evidence
- Contradictions or uncertainty
- Missing information
- Why the development is relevant
If multiple sources are available, compare them and prioritize information that is specific, recent, technically meaningful, and directly supported by reliable sources.

STRICT WORD COUNT MANDATE:
- MINIMUM: 150 words
- MAXIMUM: 300 words
- RECOMMENDED TARGET: 180 to 300 words
(Your final post body content MUST be strictly between 150 and 300 words total. Prioritize information density over word count. Do not satisfy the word count with filler, generic introductions, or vague statements. If insufficient information exists, produce a shorter factually accurate result rather than inventing details, but aim for 150-300 when enough source information is available.)

TOPIC DETAILS:
- Requested Topic: ${topic.title}
- Category: ${topicCategory}
- Source: ${topic.source}
- URL: ${topic.url}
- Summary: ${topic.summary}
- Editorial Score: ${evaluation.totalScore}/100

ANTI-REPETITION MANDATE:
Do not repeat recent angles or hooks:
- Recently used angles: ${previousAnglesStr}
- Avoid hooks similar to:
${previousHooksStr}

LOGICAL FLOW STRUCTURE:
${structureInstruction}
6. ORIGINAL SOURCE: Include the original verified source link (${topic.url}), not an agent's own generated URL.
7. HASHTAGS: Strictly 3–5 relevant hashtags matching ${topicCategory}. Match the content and hashtags to the actual topic. Don't add unrelated hashtags like #AISecurity if the topic isn't about AI security.

Output MUST be strictly valid JSON:
{
  "title": "string (Punchy headline specific to ${topic.title} and ${contentAngle})",
  "content": "string (The complete post text focused strictly on ${topic.title}, 150–300 words)",
  "topicCategory": "${topicCategory}",
  "contentAngle": "${contentAngle}",
  "rationale": "string (Analysis of ${topic.title})",
  "whySelected": "string (Selection justification)",
  "whyRelevantNow": "string (Timeliness and technical impact)",
  "sources": ["${topic.url}"]
}`;
}
