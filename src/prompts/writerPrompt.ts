import { DiscoveredTopic, EditorialEvaluation, Persona } from '../models/types';
import { getPersonaSystemPrompt } from './personaPrompt';
import { AntiRepetitionContext } from '../agent/memory';

export function getWriterPrompt(
  persona: Persona,
  topic: DiscoveredTopic,
  evaluation: EditorialEvaluation,
  contentAngle: string = 'Technical Explanation',
  antiRepetition?: AntiRepetitionContext
): string {
  const personaContext = getPersonaSystemPrompt(persona);

  const previousHooksStr = antiRepetition?.recentHooks?.length 
    ? antiRepetition.recentHooks.slice(0, 3).map(h => `  - "${h}"`).join('\n')
    : '  - None';

  const previousAnglesStr = antiRepetition?.recentAngles?.length
    ? antiRepetition.recentAngles.slice(0, 5).join(', ')
    : 'None';

  return `${personaContext}

WRITING TASK:
You are an expert technology and AI security writer.
Write ONE original, evidence-based, professional social media post for the topic below.

Primary Domain Focus: ${persona.domain}
Assigned Content Angle: ${contentAngle}

STRICT WORD COUNT MANDATE:
- MINIMUM: 200 words
- MAXIMUM: 300 words
- RECOMMENDED TARGET: 230 to 260 words
(Your final post body content MUST be strictly between 200 and 300 words total. Do not count source URL or hashtags in the word count.)

TOPIC DETAILS:
- Title: ${topic.title}
- Source: ${topic.source}
- URL: ${topic.url}
- Summary: ${topic.summary}
- Editorial Score: ${evaluation.totalScore}/100

ANTI-REPETITION MANDATE:
Do not repeat the wording, structure, perspective, examples, hooks, or conclusions of recent posts. Produce genuinely new information or a substantially different analytical angle.
- Recently used angles: ${previousAnglesStr}
- Avoid hooks similar to:
${previousHooksStr}

STRUCTURE MANDATE (FOLLOW THIS LOGICAL FLOW):
1. HOOK (20–40 words): Specific and informative opening establishing why this topic matters. Avoid generic hooks like "AI is changing the world".
2. WHAT HAPPENED / WHAT IS IT? (40–60 words): Clearly explain what was discovered, technologies involved, research findings, or vulnerability.
3. TECHNICAL EXPLANATION (50–80 words): Explain the core technical mechanism using clear, simple, professional English. Preserve technical accuracy while making it accessible to interested developers.
4. WHY IT MATTERS (40–60 words): Practical impact on security, developers, privacy, or infrastructure.
5. KEY TAKEAWAY (20–40 words): Meaningful conclusion providing actionable insight.
6. SOURCE: Include the source link (${topic.url}).
7. HASHTAGS: Strictly 3–5 relevant hashtags (e.g., #AISecurity #LLMSecurity #AISafety).

KNOWLEDGE DENSITY & FACTUAL ACCURACY RULES:
- PRIORITIZE: Accuracy > Knowledge > Originality > Clarity > Engagement.
- Include at least 1 verified technical fact, 1 clear technical mechanism explanation, and 1 practical takeaway.
- DO NOT invent CVE numbers, fake dates, company statements, fake statistics, or exaggerated claims.
- Do NOT claim personal testing ("I tested this...") unless specified; use attribution ("Researchers found...", "According to the disclosure...").
- Simple language + strong technical knowledge.

Output MUST be strictly valid JSON:
{
  "title": "string (Punchy informative headline)",
  "content": "string (The complete post text following the 7-part structure, STRICTLY 200–300 words)",
  "contentAngle": "${contentAngle}",
  "rationale": "string (Why selected for ${persona.domain} persona)",
  "whySelected": "string (Technical selection justification)",
  "whyRelevantNow": "string (Timeliness and domain impact)",
  "sources": ["${topic.url}"]
}`;
}
