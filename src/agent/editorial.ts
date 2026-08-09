import { DiscoveredTopic, EditorialEvaluation, Persona } from '../models/types';
import { OpenAIService } from '../services/openai';
import { Logger } from '../utils/logger';
import { MemoryEngine } from './memory';

export class EditorialEngine {
  private openaiService: OpenAIService;
  private memoryEngine: MemoryEngine;

  constructor() {
    this.openaiService = new OpenAIService();
    this.memoryEngine = new MemoryEngine();
  }

  async evaluateTopics(
    agentId: string,
    persona: Persona,
    topics: DiscoveredTopic[]
  ): Promise<EditorialEvaluation[]> {
    Logger.info(`Evaluating ${topics.length} candidate topics against strict AI Security criteria (Threshold > 80)...`, agentId);

    const memorySummaries = await this.memoryEngine.getRecentMemories(agentId);
    const evaluations: EditorialEvaluation[] = [];

    for (const topic of topics) {
      // Memory check
      const isMemDuplicate = await this.memoryEngine.isDuplicate(agentId, topic);

      if (isMemDuplicate) {
        const rejectionReason = 'Duplicate topic detected in database memory';
        const evalResult: EditorialEvaluation = {
          topic,
          scores: { relevance: 50, novelty: 10, impact: 20, timeliness: 80, duplicateScore: 100 },
          totalScore: 20,
          overallScore: 20,
          passed: false,
          rejectionReason,
        };

        evaluations.push(evalResult);

        // Log rejected topic with explicit rejection reason
        Logger.editorial(
          `REJECTED Topic "${topic.title}" — Reason: ${rejectionReason}`,
          agentId,
          { topicUrl: topic.url, source: topic.source, totalScore: 20, rejectionReason }
        );
        continue;
      }

      // LLM / Heuristic evaluation
      const evalResult = await this.openaiService.evaluateEditorial(persona, topic, memorySummaries);
      evaluations.push(evalResult);

      if (evalResult.passed) {
        Logger.editorial(
          `APPROVED Topic "${topic.title}" — Total Score: ${evalResult.totalScore}/100 (Threshold > 80)`,
          agentId,
          { topicUrl: topic.url, source: topic.source, totalScore: evalResult.totalScore, scores: evalResult.scores }
        );
      } else {
        const reason = evalResult.rejectionReason || `Total score (${evalResult.totalScore}/100) below publication threshold of > 80`;
        Logger.editorial(
          `REJECTED Topic "${topic.title}" — Reason: ${reason}`,
          agentId,
          { topicUrl: topic.url, source: topic.source, totalScore: evalResult.totalScore, rejectionReason: reason, scores: evalResult.scores }
        );
      }
    }

    return evaluations;
  }
}
