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
2. WHAT IS IT / WHAT HAPPENED? (40–60 words): Factual explanation of ${topic.title}.
3. TECHNICAL EXPLANATION (50–80 words): Explain technical mechanics of ${topic.title} using simple, professional English.
4. WHY IT MATTERS (40–60 words): Practical technical impact on developers, systems, or architecture.
5. KEY TAKEAWAY (20–40 words): Meaningful concluding insight on ${topic.title}. Avoid generic conclusions like "stay vigilant".`;

  if (isMisconception) {
    angleInstruction = `Assigned Content Angle: Common Misconception (Identify a genuine misconception about "${topic.title}", explain why it is wrong, provide verified factual evidence, and clarify the key takeaway).`;
    structureInstruction = `1. MISCONCEPTION (20–40 words): Clearly state the common misconception about "${topic.title}".
2. WHAT IS ACTUALLY TRUE (40–60 words): Provide verified factual evidence correcting the misconception.
3. TECHNICAL EXPLANATION (50–80 words): Explain why the misconception exists and the real technical mechanics.
4. WHY THE CONFUSION EXISTS / PRACTICAL IMPACT (40–60 words): Practical relevance for developers or technical teams.
5. KEY TAKEAWAY (20–40 words): Clear, memorable takeaway correcting the misconception.`;
  }

  return `${personaContext}

MANDATORY WRITER INSTRUCTION:
Do not write a generic social media post about the topic. First understand the topic, identify the most important information, determine what the reader needs to know, and then explain it clearly in your own words. The structure must be chosen based on the topic rather than copied from previous posts. Every paragraph must add meaningful information. Prefer specific verified facts and useful technical explanations over generic statements. Use simple English without removing important technical meaning. The final result should teach the reader something concrete and should feel substantially different from previous posts.

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
NEVER use generic AI clichés or filler phrases:
- DO NOT USE: "In today's rapidly evolving world", "This marks a significant milestone", "The future of AI is here", "As AI continues to transform", "This is a game changer", "The possibilities are endless", "It is important to note that", "In conclusion", "This highlights the importance of".
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
6. SOURCE: Include the source link (${topic.url}).
7. HASHTAGS: Strictly 3–5 relevant hashtags matching ${topicCategory}.

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
