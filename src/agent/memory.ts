import { prisma } from '../database/prisma';
import { DiscoveredTopic } from '../models/types';
import { Logger } from '../utils/logger';

export class MemoryEngine {
  async getRecentMemories(agentId: string, limit: number = 30): Promise<string[]> {
    const memories = await prisma.memory.findMany({
      where: { agentId },
      orderBy: { coveredAt: 'desc' },
      take: limit,
    });

    return memories.map((m: { topicTitle: any; topicUrl: any; summary: any; }) => `${m.topicTitle} (${m.topicUrl}) - ${m.summary}`);
  }

  async isDuplicate(agentId: string, topic: DiscoveredTopic): Promise<boolean> {
    // 1. Exact URL check
    const existingUrl = await prisma.memory.findFirst({
      where: {
        agentId,
        topicUrl: topic.url,
      },
    });

    if (existingUrl) {
      return true;
    }

    // 2. Exact Title check or high token overlap
    const memories = await prisma.memory.findMany({
      where: { agentId },
      select: { topicTitle: true },
      take: 100,
    });

    const topicTitleClean = topic.title.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    for (const mem of memories) {
      const memTitleClean = mem.topicTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '');

      if (memTitleClean === topicTitleClean) return true;

      const memWords = memTitleClean.split(/\s+/).filter((w: string | any[]) => w.length > 3);
      const topicWords = topicTitleClean.split(/\s+/).filter(w => w.length > 3);

      if (memWords.length > 0 && topicWords.length > 0) {
        const overlap = topicWords.filter(w => memWords.includes(w));
        const similarity = overlap.length / Math.min(memWords.length, topicWords.length);
        if (similarity >= 0.75) {
          return true;
        }
      }
    }

    return false;
  }

  async saveMemory(agentId: string, topic: DiscoveredTopic, summary: string): Promise<void> {
    try {
      await prisma.memory.create({
        data: {
          agentId,
          topicUrl: topic.url,
          topicTitle: topic.title,
          summary: summary.slice(0, 500),
        },
      });
      Logger.info(`Saved topic memory for agent ${agentId}: "${topic.title}"`, agentId);
    } catch (error) {
      Logger.error(`Failed to save memory for topic ${topic.title}`, error, agentId);
    }
  }
}
