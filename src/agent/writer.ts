import { prisma } from '../database/prisma';
import { DiscoveredTopic, EditorialEvaluation, GeneratedPost, Persona } from '../models/types';
import { OpenAIService } from '../services/openai';
import { Logger } from '../utils/logger';
import { MemoryEngine } from './memory';

export class WriterEngine {
  private openaiService: OpenAIService;
  private memoryEngine: MemoryEngine;

  constructor() {
    this.openaiService = new OpenAIService();
    this.memoryEngine = new MemoryEngine();
  }

  async createAndPublishPost(
    agentId: string,
    persona: Persona,
    topic: DiscoveredTopic,
    evaluation: EditorialEvaluation
  ) {
    Logger.info(`Writing technical post for approved topic: "${topic.title}"`, agentId);

    let postData: GeneratedPost = await this.openaiService.generatePost(persona, topic, evaluation);
    Logger.info(`Draft generated`, agentId);

    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    let finalDecision = 'APPROVED';
    let isApproved = false;

    while (attempt <= MAX_ATTEMPTS) {
      // 1. Fact Checker
      const factCheckResult = await this.openaiService.factCheckPost(persona, topic, postData);
      
      if (!factCheckResult.passed) {
        Logger.warn(`Fact Checker found issues: ${factCheckResult.issues.join(', ')}`, agentId);
        
        await prisma.improvementAttempt.create({
          data: {
            agentId,
            attemptNumber: attempt,
            content: postData.content,
            scores: JSON.stringify({ factCheckConfidence: factCheckResult.confidence }),
            weaknesses: JSON.stringify(factCheckResult.issues),
            improvementSuggestions: JSON.stringify(factCheckResult.corrections),
            finalDecision: 'REJECTED_FACTS',
          }
        });

        if (attempt >= MAX_ATTEMPTS) {
          finalDecision = 'REJECTED';
          Logger.error(`Max attempts reached. Fact check failed.`, undefined, agentId);
          break;
        }

        Logger.info(`Rewrite attempt ${attempt + 1}`, agentId);
        postData = await this.openaiService.generateRewrite(persona, topic, postData, factCheckResult.issues, factCheckResult.corrections);
        attempt++;
        continue;
      }

      // 2. Critic
      const criticResult = await this.openaiService.evaluateCritic(persona, topic, postData);
      Logger.info(`Score: ${criticResult.scores.overallScore}`, agentId);

      if (!criticResult.passed || criticResult.scores.overallScore < 80) {
        Logger.warn(`Critic found weaknesses`, agentId);
        
        await prisma.improvementAttempt.create({
          data: {
            agentId,
            attemptNumber: attempt,
            content: postData.content,
            scores: JSON.stringify(criticResult.scores),
            weaknesses: JSON.stringify(criticResult.weaknesses),
            improvementSuggestions: JSON.stringify(criticResult.improvementSuggestions),
            finalDecision: 'REJECTED_CRITIC',
          }
        });

        if (attempt >= MAX_ATTEMPTS) {
          finalDecision = 'REJECTED';
          Logger.error(`Max attempts reached. Critic score < 80.`, undefined, agentId);
          break;
        }

        Logger.info(`Rewrite attempt ${attempt + 1}`, agentId);
        postData = await this.openaiService.generateRewrite(persona, topic, postData, criticResult.weaknesses, criticResult.improvementSuggestions);
        attempt++;
        continue;
      }

      // Approved!
      Logger.info(`APPROVED`, agentId);
      await prisma.improvementAttempt.create({
        data: {
          agentId,
          attemptNumber: attempt,
          content: postData.content,
          scores: JSON.stringify(criticResult.scores),
          weaknesses: JSON.stringify([]),
          improvementSuggestions: JSON.stringify([]),
          finalDecision: 'APPROVED',
        }
      });
      isApproved = true;
      break;
    }

    if (!isApproved) {
      return null;
    }

    // Save Post to Database
    const createdPost = await prisma.post.create({
      data: {
        agentId,
        title: postData.title,
        content: postData.content,
        rationale: postData.rationale,
        whySelected: postData.whySelected,
        whyRelevantNow: postData.whyRelevantNow,
        sources: JSON.stringify(postData.sources),
        topicUrl: topic.url,
        topicSource: topic.source,
        publishedAt: new Date(),
      },
    });

    // Save Memory record
    await this.memoryEngine.saveMemory(agentId, topic, postData.rationale);

    Logger.info(`PUBLISHED POST #${createdPost.id}: "${createdPost.title}"`, agentId);

    return createdPost;
  }
}
