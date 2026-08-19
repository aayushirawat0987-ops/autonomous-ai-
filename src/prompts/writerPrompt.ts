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

  return `${personaContext}

UNIVERSAL TOPIC-GROUNDING MANDATE (CRITICAL RULE):
- Requested Topic: "${topic.title}"
- Topic Category: "${topicCategory}"
- Primary Subject: "${topic.title}"

CRITICAL INSTRUCTION ON SUBJECT VS PERSONALITY:
The requested topic "${topic.title}" MUST be the PRIMARY SUBJECT of the entire post.
- If the topic is "SUPERCOMPUTER", write strictly about supercomputers, HPC, parallel processing, GPUs/CPUs, nodes, and computational workloads.
- If the topic is "QUANTUM COMPUTING", write strictly about qubits, quantum gates, superposition, error correction, and quantum hardware.
- If the topic is "ROBOTICS", write strictly about sensors, perception, actuators, kinematics, control systems, and automation.
- If the topic is "PYTHON", write strictly about Python language features, memory management, syntax, libraries, and runtime.
- Do NOT force "${topic.title}" into AI Security, prompt injection, LLM jailbreaks, or generic cybersecurity UNLESS the topic itself is specifically about AI Security.
- The agent's persona (${persona.role}) dictates HOW the content is written (analytical style, clear technical depth), NOT WHAT the topic is about.

NO INTERNAL SYSTEM TEXT MANDATE:
NEVER expose internal system text or generation metadata in your response or content body.
- NEVER write: "User Manual Request", "Manual post generation request", "The user asked...", "According to the prompt...", or "As requested...".
- The final text must read strictly as a published professional technical post.

STRICT WORD COUNT MANDATE:
- MINIMUM: 200 words
- MAXIMUM: 300 words
- RECOMMENDED TARGET: 230 to 260 words
(Your final post body content MUST be strictly between 200 and 300 words total. Do not count source URL or hashtags in the word count.)

TOPIC DETAILS:
- Requested Topic: ${topic.title}
- Category: ${topicCategory}
- Source: ${topic.source}
- URL: ${topic.url}
- Summary: ${topic.summary}
- Editorial Score: ${evaluation.totalScore}/100
- Assigned Content Angle: ${contentAngle}

ANTI-REPETITION MANDATE:
Do not repeat the wording, structure, perspective, examples, hooks, or conclusions of recent posts. Produce genuinely new information or a substantially different analytical angle.
- Recently used angles: ${previousAnglesStr}
- Avoid hooks similar to:
${previousHooksStr}

LOGICAL FLOW STRUCTURE:
1. HOOK (20–40 words): Specific and informative opening establishing why "${topic.title}" matters. Avoid generic hooks like "Technology is changing the world".
2. WHAT IS IT / WHAT HAPPENED? (40–60 words): Clearly explain what ${topic.title} is, recent developments, or specific findings.
3. TECHNICAL EXPLANATION (50–80 words): Explain the underlying technical mechanism of ${topic.title} in simple, professional, human-readable English.
4. WHY IT MATTERS (40–60 words): Practical impact on systems, developers, performance, or infrastructure.
5. KEY TAKEAWAY (20–40 words): Meaningful conclusion providing actionable insight on ${topic.title}.
6. SOURCE: Include the source link (${topic.url}).
7. HASHTAGS: Strictly 3–5 relevant hashtags matching ${topicCategory}.

Output MUST be strictly valid JSON:
{
  "title": "string (Punchy headline about ${topic.title})",
  "content": "string (The complete post text focused strictly on ${topic.title}, STRICTLY 200–300 words)",
  "topicCategory": "${topicCategory}",
  "contentAngle": "${contentAngle}",
  "rationale": "string (Analysis of ${topic.title})",
  "whySelected": "string (Selection justification)",
  "whyRelevantNow": "string (Timeliness and technical impact)",
  "sources": ["${topic.url}"]
}`;
}
