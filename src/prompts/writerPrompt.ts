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
  let structureInstruction = `1. HOOK (20–40 words): Specific opening about "${topic.title}". Avoid questions like "Did you know?" or "What if?".
2. WHAT HAPPENED? (40–60 words): Extract concrete facts: what happened, what's new, and evidence/benchmarks.
3. TECHNICAL INSIGHT (50–80 words): Explain how it works using simple, professional English. Prefer one genuine technical insight over several generic statements.
4. WHY IT MATTERS (40–60 words): Practical technical impact on developers, systems, or architecture.
5. TAKEAWAY (20–40 words): Meaningful concluding insight on ${topic.title}. Avoid generic conclusions like "stay vigilant".`;

  if (isMisconception) {
    angleInstruction = `Assigned Content Angle: Common Misconception (Identify a genuine misconception about "${topic.title}", explain why it is wrong, provide verified factual evidence, and clarify the key takeaway).`;
    structureInstruction = `1. HOOK / MISCONCEPTION (20–40 words): Clearly state the common misconception about "${topic.title}".
2. WHAT HAPPENED? / WHAT IS ACTUALLY TRUE (40–60 words): Extract concrete facts and evidence/benchmarks correcting the misconception.
3. TECHNICAL INSIGHT (50–80 words): Explain how it works and why the misconception exists. Prefer one genuine technical insight over several generic statements.
4. WHY IT MATTERS (40–60 words): Practical relevance for developers or technical teams.
5. TAKEAWAY (20–40 words): Clear, memorable takeaway correcting the misconception.`;
  }

  return `${personaContext}

MANDATORY WRITER INSTRUCTION:
Make every post specific, factual, technical, and human-sounding, not generic AI-generated filler. Never invent research, statistics, companies, findings, or technical claims. Do not write a generic social media post about the topic. First understand the topic, identify the most important information, determine what the reader needs to know, and then explain it clearly in your own words. The structure must be chosen based on the topic rather than copied from previous posts. Every paragraph must add meaningful information. Prefer specific verified facts and useful technical explanations over generic statements. Use simple English without removing important technical meaning. The final result should teach the reader something concrete and should feel substantially different from previous posts.

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

CASE STUDY / CONTENT TYPE RULE (CRITICAL RULE):
- If the content type / post type is "Case Study", the article MUST contain actual case-study analysis of a documented source, publication, research result, company, or implementation.
- Do NOT generate generic introductory filler such as:
  - "recent disclosures regarding..."
  - "Recent technical analysis published by..."
  - "Technical Topic Request..."
  - "Technical overview and analysis..."
  - "significant progress regarding..."
  These are FORBIDDEN unless an actual source, publication, research result, company, implementation, or documented technical development has been provided.
- The opening / WHAT IT IS section MUST immediately explain the topic directly.
  For example:
  TOPIC = BLOCKCHAIN
  Correct: "Blockchain is a distributed ledger technology that..."
  Incorrect: "Recent technical analysis published by Technical Topic Request details significant progress regarding BLOCKCHAIN."
- NEVER use placeholders such as: "Technical Topic Request", "Technical Request", "Technical overview and analysis", "[topic]", "[source]", "[company]", or "recent disclosures" without a real disclosure.
- If no real case study/source is available, clearly label the content as a "Technical Overview" instead of pretending that a case study or recent disclosure exists.

NO FORMULAIC AI CLICHÉS MANDATE:
NEVER use generic AI clichés, repetitive buzzwords, or filler phrases:
- DO NOT USE: "In today's rapidly evolving world", "This marks a significant milestone", "The future of AI is here", "As AI continues to transform", "This is a game changer", "The possibilities are endless", "It is important to note that", "In conclusion", "This highlights the importance of", "recent technical analysis", "significant progress", "emerging technology systems", "recent disclosures regarding", "technical topic request".
- DO NOT USE dramatic question hooks ("Did you know?", "What if?", "Imagine?", "Here's why").

NO INTERNAL SYSTEM TEXT MANDATE:
NEVER expose internal system text or generation metadata in your response or content body.
- NEVER write: "User Manual Request", "Manual post generation request", "The user asked...", "According to the prompt...", or "As requested...".

STRICT WORD COUNT MANDATE:
- MINIMUM: 200 words
- MAXIMUM: 300 words
- RECOMMENDED TARGET: 230 to 270 words
(Your final post body content MUST be strictly between 200 and 300 words total. Do not count source URL or hashtags in the word count.)

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
  "content": "string (The complete post text focused strictly on ${topic.title}, STRICTLY 200–300 words)",
  "topicCategory": "${topicCategory}",
  "contentAngle": "${contentAngle}",
  "rationale": "string (Analysis of ${topic.title})",
  "whySelected": "string (Selection justification)",
  "whyRelevantNow": "string (Timeliness and technical impact)",
  "sources": ["${topic.url}"]
}`;
}
