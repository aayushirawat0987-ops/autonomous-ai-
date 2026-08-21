import { DiscoveredTopic, EditorialEvaluation, Persona, StructuredContentPlan } from '../models/types';
import { getPersonaSystemPrompt } from './personaPrompt';
import { AntiRepetitionContext } from '../agent/memory';

export function getWriterPrompt(
  persona: Persona,
  topic: DiscoveredTopic,
  evaluation: EditorialEvaluation,
  contentAngle: string = 'Technical Explanation',
  antiRepetition?: AntiRepetitionContext,
  topicCategory: string = 'General Technology',
  plan?: StructuredContentPlan
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
  const minWords = plan?.minimumWords || 150;
  const targetWords = plan?.targetWords || 250;
  const maxWords = plan?.maximumWords || 300;

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
    structureInstruction = `1. MISCONCEPTION IDENTIFICATION: Clearly state the common misconception about "${topic.title}".
2. WHAT IS ACTUALLY TRUE: Extract concrete facts, mechanisms, and evidence correcting the misconception.
3. TECHNICAL DETAILS: Deep technical explanation of why the misconception exists and how the underlying mechanism actually operates in practice.
4. WHAT IS GENUINELY NEW: Explain how this differs from previous approaches.
5. WHY IT MATTERS: Explain the real technical, business, developer, research, security, or user impact.
6. WHO IS AFFECTED: Identify relevant stakeholders.
7. EVIDENCE: Provide concrete facts and direct technical findings.
8. LIMITATIONS AND CAVEATS: Include limitations or trade-offs.
9. PRACTICAL TAKEAWAY: Explain what developers or users should actually understand or do differently.`;
  }

  let planBlock = '';
  if (plan) {
    planBlock = `
STRUCTURED CONTENT PLAN (MANDATORY EXECUTION TARGET):
- Primary Subject: "${plan.primarySubject}"
- Secondary Subject / Domain: "${plan.secondarySubject || 'None'}"
- Relationship: "${plan.relationship}"
- User Intent: "${plan.intent}"
- Post Type: "${plan.postType}"
- Target Platform: "${plan.platform}"
- Tone & Style: "${plan.tone}"
- Additional Instructions: "${plan.additionalInstructions || 'None'}"
`;
  }


  return `${personaContext}

MANDATORY WRITER INSTRUCTION:
Make every post specific, factual, technical, and human-sounding, not generic AI-generated filler. Never invent research, statistics, companies, findings, or technical claims. Prioritize information density over word count. Avoid empty introductions and generic conclusions. Preserve important technical terminology from the source. Do not simply summarize the first paragraph of an article. The final result should feel like it was written by a technical AI news analyst/research editor. Every paragraph must add meaningful information.
${planBlock}
CLASSIFICATION & GROUNDING MANDATE (CRITICAL RULE):
- Requested Topic / Query: "${topic.title}"
- Topic Category: "${topicCategory}"
- Primary Subject / Core Technology: "${plan?.primarySubject || topic.title}"
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
   - Explain the CORE TECHNOLOGY directly and clearly.
   - Do NOT explain the user's search phrase or user wording.
   - Introduce the technology using technically accurate language.
2. TECHNICAL EXPLANATION:
   - Explain concepts specifically related to the requested technology AND intent.
   - Do NOT use generic engineering statements ("optimizing execution pathways", "resource management").
   - Include concrete mechanisms, trade-offs, architecture, or verifiable technical details.
3. PRACTICAL APPLICATIONS / WHY IT MATTERS:
   - Explain practical relevance for systems engineers, developers, or business decisions.
   - Connect the explanation directly to the requested intent.
4. KEY TAKEAWAY:
   - Summarize the actual technical insight.
   - Do NOT repeat generic statements about "performance", "scalability", "efficiency", or "modern architecture" unless specifically relevant.

BUSINESS IMPACT / ADVANTAGES RULE:
- When the intent covers "advantages", "benefits", "business impact", "business value", or "why use", the content MUST discuss actual technical advantages AND limitations of the CORE TECHNOLOGY.
- For Blockchain:
  - Advantages: shared transaction records, reduced reconciliation, traceability, auditability, smart-contract automation, multi-party coordination, tamper-evident records, reduced dependency on intermediaries.
  - Limitations: scalability, transaction costs, governance, integration complexity, privacy, regulatory requirements, suitability compared with conventional databases.
  - Do NOT claim that blockchain is automatically better than a centralized database.

SUBTOPIC / "USE OF X IN Y" RULE (CRITICAL MANDATE):
- When the query is of the form "USE OF X IN Y", "ROLE OF X IN Y", "APPLICATIONS OF X IN Y", "HOW X IS USED IN Y", "X FOR Y DEVELOPMENT", or "X IN Y" (e.g. "USE OF PYTHON IN BLOCKCHAIN"):
  - DO NOT treat the entire phrase as the technology name! (NEVER write: "USE OF PYTHON IN BLOCKCHAIN utilizes cryptographic hashing...")
  - Separate it into:
    * X = Tool / Language / Technology (e.g., Python)
    * Y = Target Technology / Domain (e.g., Blockchain)
  - Explain specifically:
    * What X (e.g. Python) is actually used for in Y (e.g. Blockchain)
    * Relevant X libraries/frameworks (e.g. Web3.py, Brownie, Ethereum-tester, Eth-utils)
    * Interaction with Y nodes via RPC/REST APIs
    * Smart contract interaction, ABI encoding, and transaction building/signing/submission
    * Testing, deployment automation, blockchain data analytics, and backend microservices
    * Limitations & security considerations
  - Clearly distinguish between:
    1. The underlying domain protocol (Y) (e.g. Blockchain consensus, block propagation)
    2. The programming language / application (X) (e.g. Python) interacting with it
  - Do NOT attribute protocol responsibilities (like consensus algorithms or peer-to-peer block hashing) to the language (X) unless technically accurate for a specific client implementation.

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

STRICT WORD COUNT MANDATE (CRITICAL):
- MINIMUM: ${minWords} words
- TARGET WORD COUNT: ${targetWords} words
- MAXIMUM: ${maxWords} words

Your final article content MUST be strictly between ${minWords} and ${maxWords} words (Target: ${targetWords} words).
Aim for the TARGET WORD COUNT (${targetWords} words). Do NOT add generic filler simply to increase length.
If your draft is under ${minWords} words, expand the TECHNICAL EXPLANATION and PRACTICAL APPLICATIONS sections with detailed architectural mechanics, code patterns, and technical trade-offs.
If your draft exceeds ${maxWords} words, trim filler phrases and redundant adjectives without cutting core technical facts.

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
  "title": "string (Punchy headline specific to ${topic.title} and ${contentAngle})",
  "content": "string (Complete post text focused strictly on ${topic.title}, STRICTLY BETWEEN ${minWords} AND ${maxWords} WORDS)",
  "topicCategory": "${topicCategory}",
  "contentAngle": "${contentAngle}",
  "rationale": "string (Analysis of ${topic.title})",
  "whySelected": "string (Selection justification)",
  "whyRelevantNow": "string (Timeliness and technical impact)",
  "sources": ["${topic.url}"]
}`;
}
