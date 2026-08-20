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
  let structureInstruction = `1. HOOK / WHAT IT IS (35–50 words): Clear, engaging technical opening directly explaining "${topic.title}". Avoid generic question hooks.
2. WHAT HAPPENED / CONCRETE DEVELOPMENTS (50–70 words): Explain key developments, verifiable facts, architectural mechanics, or evidence.
3. TECHNICAL EXPLANATION & MECHANISMS (80–110 words): Deep technical analysis of mechanisms, trade-offs, advantages, and limitations. Explain how it works in practice with high detail density.
4. WHY IT MATTERS / BUSINESS IMPACT (50–70 words): Explain practical relevance for systems engineers, developers, or business decisions.
5. KEY TAKEAWAY (30–40 words): Meaningful, actionable technical takeaway summarizing the core insight.`;

  if (isMisconception) {
    angleInstruction = `Assigned Content Angle: Common Misconception (Identify a genuine misconception about "${topic.title}", explain why it is wrong, provide verified factual evidence, and clarify the key takeaway).`;
    structureInstruction = `1. HOOK / MISCONCEPTION (35–50 words): Clearly state the common misconception about "${topic.title}".
2. WHAT IS ACTUALLY TRUE (50–70 words): Extract concrete facts, mechanisms, and evidence correcting the misconception.
3. TECHNICAL INSIGHT & TRADE-OFFS (80–110 words): Deep technical explanation of why the misconception exists and how the underlying mechanism actually operates in practice.
4. WHY IT MATTERS (50–70 words): Practical relevance for developers, systems architects, or technical teams.
5. KEY TAKEAWAY (30–40 words): Clear, memorable takeaway correcting the misconception.`;
  }

  return `${personaContext}

MANDATORY WRITER INSTRUCTION:
Make every post specific, factual, technical, and human-sounding, not generic AI-generated filler. Never invent research, statistics, companies, findings, or technical claims. First understand the topic, identify the core technology, determine what the reader needs to know, and then explain it clearly in your own words. Every paragraph must add meaningful information.

CLASSIFICATION & GROUNDING MANDATE (CRITICAL RULE):
- Requested Topic / Query: "${topic.title}"
- Topic Category: "${topicCategory}"
- Primary Subject / Core Technology: "${topic.title}"
- ${angleInstruction}

CRITICAL INSTRUCTION ON CORE TECHNOLOGY VS USER QUERY:
- The input must NOT be blindly treated as the technology name.
- NEVER use the entire user query phrase as the technology name!
  - FORBIDDEN: "Analyzing advantage of block chain demonstrates..."
  - CORRECT: "Blockchain can provide business value through..."
- Topic determines WHAT the post is about.
- Persona determines HOW it is written (analytical style, clear technical depth).

SECTION-SPECIFIC RULES:
1. WHAT IT IS:
   - Explain the CORE TECHNOLOGY directly and clearly (35-50 words).
   - Do NOT explain the user's search phrase or user wording.
   - Introduce the technology using technically accurate language.
2. TECHNICAL EXPLANATION:
   - Explain concepts specifically related to the requested technology AND intent (80-110 words).
   - Do NOT use generic engineering statements ("optimizing execution pathways", "resource management").
   - Include concrete mechanisms, trade-offs, architecture, or verifiable technical details.
3. WHY IT MATTERS:
   - Explain why the topic matters in real-world engineering or business (50-70 words).
   - Connect the explanation directly to the requested intent.
4. KEY TAKEAWAY:
   - Summarize the actual technical insight (30-40 words).
   - Do NOT repeat generic statements about "performance", "scalability", "efficiency", or "modern architecture" unless specifically relevant.

BUSINESS IMPACT / ADVANTAGES RULE:
- When the intent covers "advantages", "benefits", "business impact", "business value", or "why use", the content MUST discuss actual technical advantages AND limitations of the CORE TECHNOLOGY.
- For Blockchain:
  - Advantages: shared transaction records, reduced reconciliation, traceability, auditability, smart-contract automation, multi-party coordination, tamper-evident records, reduced dependency on intermediaries.
  - Limitations: scalability, transaction costs, governance, integration complexity, privacy, regulatory requirements, suitability compared with conventional databases.
  - Do NOT claim that blockchain is automatically better than a centralized database.

TECHNICAL ACCURACY MANDATE:
- Do NOT treat technically different concepts as equivalent (e.g. Proof-of-Stake is NOT simply another name for Byzantine Fault Tolerance).
- Explain relationships between technologies accurately with zero invented details.

CASE STUDY / CONTENT TYPE RULE:
- If the content type / post type is "Case Study", the article MUST contain actual case-study analysis of a documented source, publication, research result, company, or implementation.
- Do NOT generate generic introductory filler such as:
  - "recent disclosures regarding..."
  - "Recent technical analysis published by..."
  - "Technical Topic Request..."
  - "Technical overview and analysis..."
  - "significant progress regarding..."
  - "Technical disclosures published by Technical Request..."
- NEVER use placeholders: "Technical Topic Request", "Technical Request", "Technical overview and analysis", "[topic]", "[source]", "[company]", or "recent disclosures" without a real disclosure.
- If no real case study/source is available, clearly label the content as a "Technical Overview" instead of pretending that a case study or recent disclosure exists.

NO FORMULAIC AI CLICHÉS MANDATE:
NEVER use generic AI clichés, repetitive buzzwords, or filler phrases:
- DO NOT USE: "In today's rapidly evolving world", "This marks a significant milestone", "The future of AI is here", "As AI continues to transform", "This is a game changer", "The possibilities are endless", "It is important to note that", "In conclusion", "This highlights the importance of", "recent technical analysis", "significant progress", "emerging technology systems", "recent disclosures regarding", "technical topic request", "optimizing execution pathways and resource management", "streamlined workflow execution across complex technical workloads".
- DO NOT USE dramatic question hooks ("Did you know?", "What if?", "Imagine?", "Here's why").

NO INTERNAL SYSTEM TEXT MANDATE:
NEVER expose internal system text or generation metadata in your response or content body.
- NEVER write: "User Manual Request", "Manual post generation request", "The user asked...", "According to the prompt...", or "As requested...".

STRICT WORD COUNT MANDATE (CRITICAL):
- MINIMUM: 250 words (Content MUST NOT be under 250 words under any circumstances)
- MAXIMUM: 300 words
- RECOMMENDED TARGET: 260 to 290 words
(Your final post body content MUST be strictly between 250 and 300 words total. If your draft is below 250 words, expand the TECHNICAL EXPLANATION and BUSINESS IMPACT sections with additional verified technical details until it reaches 250-300 words.)

TOPIC DETAILS:
- Requested Topic: ${topic.title}
- Category: ${topicCategory}
- Source: ${topic.source}
- URL: ${topic.url}
- Summary: ${topic.summary}
- Editorial Score: ${evaluation.totalScore}/100

ANTI-REPETITION CHECK:
1. Compare every section against every other section.
2. Remove repeated sentences and repeated ideas.
3. Ensure WHAT IT IS contains a clear definition.
4. Ensure TECHNICAL EXPLANATION contains actual technical information.
5. Ensure WHY IT MATTERS answers "why should the reader care?".
6. Ensure KEY TAKEAWAY summarizes the actual insight.

LOGICAL FLOW STRUCTURE:
${structureInstruction}
6. ORIGINAL SOURCE: Include the original verified source link (${topic.url}), not an agent's own generated URL.
7. HASHTAGS: Strictly 3–5 relevant hashtags matching ${topicCategory}. Match content and hashtags to the actual topic. Don't add unrelated hashtags.

Output MUST be strictly valid JSON:
{
  "title": "string (Headline specific to ${topic.title} and ${contentAngle})",
  "content": "string (Complete post text focused strictly on ${topic.title}, STRICTLY BETWEEN 250 AND 300 WORDS)",
  "topicCategory": "${topicCategory}",
  "contentAngle": "${contentAngle}",
  "rationale": "string (Analysis of ${topic.title})",
  "whySelected": "string (Selection justification)",
  "whyRelevantNow": "string (Timeliness and technical impact)",
  "sources": ["${topic.url}"]
}`;
}
