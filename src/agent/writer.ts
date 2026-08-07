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

    const postData: GeneratedPost = await this.openaiService.generatePost(persona, topic, evaluation);

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
