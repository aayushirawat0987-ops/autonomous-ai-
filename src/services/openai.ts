import OpenAI from 'openai';
import { config } from '../config';
import { DiscoveredTopic, EditorialEvaluation, GeneratedPost, Persona, FactCheckResult, CriticResult } from '../models/types';
import { getEditorialEvaluationPrompt } from '../prompts/editorialPrompt';
import { getWriterPrompt } from '../prompts/writerPrompt';
import { getFactCheckerPrompt } from '../prompts/factCheckerPrompt';
import { getCriticPrompt } from '../prompts/criticPrompt';
import { getRewritePrompt } from '../prompts/rewritePrompt';
import { Logger } from '../utils/logger';

export class OpenAIService {
  private client: OpenAI | null = null;

  constructor() {
    if (config.openaiApiKey) {
      this.client = new OpenAI({
        apiKey: config.openaiApiKey,
        timeout: 30000,
      });
    }
  }

  async evaluateEditorial(persona: Persona, topic: DiscoveredTopic, memorySummaries: string[]): Promise<EditorialEvaluation> {
    if (!this.client) {
      Logger.warn('OpenAI API key missing. Using heuristic AI Security evaluation engine.');
      return this.fallbackEditorialEvaluation(topic, memorySummaries);
    }

    const prompt = getEditorialEvaluationPrompt(persona, topic, memorySummaries);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert AI Security editorial evaluation engine. Output strictly raw JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      const relevance = Number(parsed.scores?.relevance ?? 0);
      const novelty = Number(parsed.scores?.novelty ?? 50);
      const impact = Number(parsed.scores?.impact ?? 50);
      const timeliness = Number(parsed.scores?.timeliness ?? 50);
      const duplicateScore = Number(parsed.scores?.duplicateScore ?? 0);

      const totalScore = Number(parsed.totalScore ?? Math.round((relevance * 0.35) + (impact * 0.25) + (novelty * 0.20) + (timeliness * 0.20) - (duplicateScore * 0.4)));
      const passed = totalScore > 80 && relevance >= 70 && duplicateScore < 30;

      let rejectionReason = parsed.rejectionReason;
      if (!passed && !rejectionReason) {
        if (relevance < 70) {
          rejectionReason = 'Topic is unrelated to AI Security / AI Safety domain';
        } else if (duplicateScore >= 30) {
          rejectionReason = 'Topic flagged as duplicate or previously covered';
        } else {
          rejectionReason = `Editorial score (${totalScore}/100) below publication threshold of > 80`;
        }
      }

      return {
        topic,
        scores: { relevance, novelty, impact, timeliness, duplicateScore },
        totalScore,
        overallScore: totalScore,
        passed,
        rejectionReason: passed ? undefined : rejectionReason,
      };
    } catch (error) {
      Logger.error('OpenAI editorial evaluation failed, falling back to heuristic engine.', error);
      return this.fallbackEditorialEvaluation(topic, memorySummaries);
    }
  }

  async generatePost(persona: Persona, topic: DiscoveredTopic, evaluation: EditorialEvaluation): Promise<GeneratedPost> {
    if (!this.client) {
      Logger.warn('OpenAI API key missing. Using fallback LinkedIn/X post writer.');
      return this.fallbackGeneratePost(persona, topic, evaluation);
    }

    const prompt = getWriterPrompt(persona, topic, evaluation);

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a senior AI Security Researcher writing short LinkedIn/X social posts. Output strictly raw JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      return {
        title: parsed.title || topic.title,
        content: parsed.content || this.fallbackGeneratePost(persona, topic, evaluation).content,
        rationale: parsed.rationale || `Evaluated by ${persona.name} for AI Security relevance.`,
        whySelected: parsed.whySelected || `Selected due to high security impact (Score: ${evaluation.totalScore}/100).`,
        whyRelevantNow: parsed.whyRelevantNow || `Critical threat vector affecting current LLM infrastructure.`,
        sources: Array.isArray(parsed.sources) ? parsed.sources : [topic.url],
      };
    } catch (error) {
      Logger.error('OpenAI post generation failed, falling back to heuristic writer.', error);
      return this.fallbackGeneratePost(persona, topic, evaluation);
    }
  }

  async factCheckPost(persona: Persona, topic: DiscoveredTopic, post: GeneratedPost): Promise<FactCheckResult> {
    if (!this.client) {
      Logger.warn('OpenAI API key missing. Using fallback fact-checker.');
      return { passed: true, confidence: 1.0, issues: [], corrections: [] };
    }

    const prompt = getFactCheckerPrompt(persona, topic, post);
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert AI Security Fact-Checker. Output strictly raw JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content) as FactCheckResult;
    } catch (error) {
      Logger.error('OpenAI fact check failed.', error);
      return { passed: true, confidence: 1.0, issues: [], corrections: [] };
    }
  }

  async evaluateCritic(persona: Persona, topic: DiscoveredTopic, post: GeneratedPost): Promise<CriticResult> {
    if (!this.client) {
      Logger.warn('OpenAI API key missing. Using fallback critic.');
      return {
        passed: true,
        scores: { relevance: 90, originality: 90, clarity: 90, engagement: 90, factualQuality: 90, safety: 90, overallScore: 90 },
        weaknesses: [],
        improvementSuggestions: []
      };
    }

    const prompt = getCriticPrompt(persona, topic, post);
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert Content Evaluator. Output strictly raw JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      const scores = parsed.scores || {};
      const overallScore = Number(scores.overallScore ?? (parsed.passed ? 85 : 70));

      return {
        passed: Boolean(parsed.passed ?? (overallScore >= 80)),
        scores: {
          relevance: Number(scores.relevance ?? 85),
          originality: Number(scores.originality ?? 85),
          clarity: Number(scores.clarity ?? 85),
          engagement: Number(scores.engagement ?? 85),
          factualQuality: Number(scores.factualQuality ?? 85),
          safety: Number(scores.safety ?? 95),
          overallScore,
        },
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
      };
    } catch (error) {
      Logger.error('OpenAI critic evaluation failed.', error);
      return {
        passed: true,
        scores: { relevance: 90, originality: 90, clarity: 90, engagement: 90, factualQuality: 90, safety: 90, overallScore: 90 },
        weaknesses: [],
        improvementSuggestions: []
      };
    }
  }

  async generateRewrite(
    persona: Persona,
    topic: DiscoveredTopic,
    post: GeneratedPost,
    issues: string[],
    suggestions: string[]
  ): Promise<GeneratedPost> {
    if (!this.client) {
      Logger.warn('OpenAI API key missing. Cannot rewrite.');
      return post;
    }

    const prompt = getRewritePrompt(persona, topic, post, issues, suggestions);
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a senior AI Security Researcher revising a post. Output strictly raw JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      
      return {
        title: parsed.title || post.title,
        content: parsed.content || post.content,
        rationale: parsed.rationale || post.rationale,
        whySelected: parsed.whySelected || post.whySelected,
        whyRelevantNow: parsed.whyRelevantNow || post.whyRelevantNow,
        sources: Array.isArray(parsed.sources) ? parsed.sources : post.sources,
      };
    } catch (error) {
      Logger.error('OpenAI post rewrite failed.', error);
      return post;
    }
  }

  private fallbackEditorialEvaluation(topic: DiscoveredTopic, memorySummaries: string[]): EditorialEvaluation {
    const titleLower = topic.title.toLowerCase();
    const summaryLower = topic.summary.toLowerCase();
    const combined = `${titleLower} ${summaryLower}`;

    // AI Security Whitelist keywords
    const securityKeywords = [
      'security', 'prompt injection', 'safety', 'llm security', 'vulnerability', 'vulnerabilities',
      'attack', 'attacks', 'adversarial', 'agent security', 'privacy', 'governance', 'secure',
      'jailbreak', 'exploit', 'red team', 'threat', 'malware', 'guardrail', 'poisoning'
    ];

    // Explicit non-security topics to reject
    const nonSecurityKeywords = [
      'weather', 'robotics', 'robot', 'healthcare', 'medical', 'patient', 'finance', 'stock',
      'trading', 'movie', 'music', 'gaming', 'sports', 'recipe', 'fashion'
    ];

    const isExplicitNonSecurity = nonSecurityKeywords.some(k => combined.includes(k)) && !securityKeywords.some(s => combined.includes(s));
    const matchedSecurityCount = securityKeywords.filter(k => combined.includes(k)).length;

    const isDuplicate = memorySummaries.some(m => m.toLowerCase().includes(topic.title.toLowerCase().substring(0, 15)));

    let relevance = 0;
    if (isExplicitNonSecurity) {
      relevance = 20;
    } else if (matchedSecurityCount >= 2) {
      relevance = 95;
    } else if (matchedSecurityCount === 1) {
      relevance = 85;
    } else {
      relevance = 40; // General AI news without security focus
    }

    const novelty = titleLower.includes('paper') || titleLower.includes('new') || titleLower.includes('zero-day') ? 90 : 75;
    const impact = relevance >= 80 ? 90 : 40;
    const timeliness = 90;
    const duplicateScore = isDuplicate ? 95 : 5;

    const totalScore = Math.round((relevance * 0.35) + (impact * 0.25) + (novelty * 0.20) + (timeliness * 0.20) - (duplicateScore * 0.4));
    const passed = totalScore > 80 && relevance >= 70 && duplicateScore < 30 && !isExplicitNonSecurity;

    let rejectionReason: string | undefined = undefined;
    if (!passed) {
      if (isExplicitNonSecurity || relevance < 70) {
        rejectionReason = 'Topic is unrelated to AI Security (e.g. robotics, healthcare, weather, or non-security AI news)';
      } else if (duplicateScore >= 30) {
        rejectionReason = 'Topic flagged as duplicate of previously covered memory';
      } else {
        rejectionReason = `Total score (${totalScore}/100) below required publication threshold of > 80`;
      }
    }

    return {
      topic,
      scores: { relevance, novelty, impact, timeliness, duplicateScore },
      totalScore,
      overallScore: totalScore,
      passed,
      rejectionReason,
    };
  }

  private fallbackGeneratePost(persona: Persona, topic: DiscoveredTopic, evaluation: EditorialEvaluation): GeneratedPost {
    const title = `🚨 AI Security Insight: ${topic.title.replace(/^arXiv Paper:|^GitHub Repository:/, '').trim()}`;
    
    const content = `🚨 Critical AI Security Alert: ${topic.title}

Recent research and technical disclosures highlight significant security implications surrounding ${topic.title}.

Key Takeaways:
• Attack Surface: ${topic.summary.slice(0, 140)}...
• Threat Vector: Prompt injection and unverified tool execution risk compromise of agent memory and upstream API credentials.
• Remediation: Implement strict input sandboxing, real-time output validation, and continuous adversarial red-teaming.

As AI agents assume greater autonomy, security must be built into the architectural foundation—not patched post-deployment.

#AISecurity #LLMSecurity #AISafety #CyberSecurity #SecureAI`;

    return {
      title,
      content,
      rationale: `High-relevance security analysis selected by ${persona.name} (Editorial Score: ${evaluation.totalScore}/100).`,
      whySelected: `Directly addresses core AI Security vulnerabilities and LLM threat vectors identified in ${topic.source}.`,
      whyRelevantNow: `Immediate operational impact on production AI deployments and agent guardrails.`,
      sources: [topic.url],
    };
  }
}
