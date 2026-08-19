import { prisma } from '../database/prisma';
import { DiscoveredTopic } from '../models/types';
import { Logger } from '../utils/logger';

export const AVAILABLE_CONTENT_ANGLES = [
  'Breaking Development',
  'Technical Explanation',
  'Security Analysis',
  'Developer Perspective',
  'Business Impact',
  'Practical Implementation',
  'Research Summary',
  'Case Study',
  'Threat Analysis',
  'Common Misconception',
  'Beginner Explanation',
  'Comparison',
  'Lessons Learned',
  'Risk Analysis',
  'Defensive Recommendations'
];

export interface AntiRepetitionContext {
  recentTitles: string[];
  recentAngles: string[];
  recentHooks: string[];
  recentSources: string[];
}

export class MemoryEngine {
  async getRecentMemories(agentId: string, limit: number = 30): Promise<string[]> {
    const memories = await prisma.memory.findMany({
      where: { agentId },
      orderBy: { coveredAt: 'desc' },
      take: limit,
    });

    return memories.map((m: { topicTitle: string; topicUrl: string; summary: string; }) => `${m.topicTitle} (${m.topicUrl}) - ${m.summary}`);
  }

  async selectContentAngle(agentId: string, topicTitle: string): Promise<string> {
    try {
      const recentPosts: any[] = await prisma.post.findMany({
        where: { agentId },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      });

      const usedAngles = new Set(recentPosts.map((p: any) => p.contentAngle).filter(Boolean));
      const unusedAngles = AVAILABLE_CONTENT_ANGLES.filter(angle => !usedAngles.has(angle));

      if (unusedAngles.length > 0) {
        const selected = unusedAngles[Math.floor(Math.random() * unusedAngles.length)];
        Logger.info(`Selected novel Content Angle: "${selected}" for agent ${agentId}`, agentId);
        return selected;
      }

      const fallback = AVAILABLE_CONTENT_ANGLES[Math.floor(Math.random() * AVAILABLE_CONTENT_ANGLES.length)];
      return fallback;
    } catch {
      return 'Technical Explanation';
    }
  }

  async getAntiRepetitionContext(agentId: string): Promise<AntiRepetitionContext> {
    try {
      const recentPosts: any[] = await prisma.post.findMany({
        where: { agentId },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      });

      const recentTitles = recentPosts.map((p: any) => p.title || '');
      const recentAngles = recentPosts.map((p: any) => p.contentAngle || 'Technical Explanation');
      const recentSources = recentPosts.map((p: any) => p.topicSource || '').filter(Boolean);
      const recentHooks = recentPosts.map((p: any) => {
        const lines = (p.content || '').split('\n').filter((l: string) => l.trim().length > 0);
        return lines[0] || '';
      }).filter(Boolean);

      return {
        recentTitles,
        recentAngles,
        recentHooks,
        recentSources,
      };
    } catch {
      return {
        recentTitles: [],
        recentAngles: [],
        recentHooks: [],
        recentSources: [],
      };
    }
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

      const memWords = memTitleClean.split(/\s+/).filter((w: string) => w.length > 3);
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
