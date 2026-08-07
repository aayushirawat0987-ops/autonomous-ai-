import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { Logger } from '../utils/logger';

export async function handleAgentFeed(req: Request, res: Response) {
  try {
    const { agentId } = req.query;

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({
        error: 'Missing required query parameter: agentId',
      });
    }

    // Verify agent existence
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return res.status(404).json({
        error: `Agent with ID '${agentId}' not found.`,
      });
    }

    // Retrieve posts ordered newest first
    const rawPosts = await prisma.post.findMany({
      where: { agentId },
      orderBy: { publishedAt: 'desc' },
    });

    const posts = rawPosts.map(p => {
      let parsedSources: string[] = [];
      try {
        parsedSources = JSON.parse(p.sources);
      } catch {
        parsedSources = [p.sources];
      }

      return {
        id: p.id,
        agentId: p.agentId,
        title: p.title,
        content: p.content,
        rationale: p.rationale,
        whySelected: p.whySelected,
        whyRelevantNow: p.whyRelevantNow,
        sources: parsedSources,
        topicUrl: p.topicUrl,
        topicSource: p.topicSource,
        publishedAt: p.publishedAt.toISOString(), // ISO 8601 UTC
      };
    });

    return res.status(200).json({
      posts,
    });
  } catch (error) {
    Logger.error('Failed to retrieve agent feed', error);
    return res.status(500).json({
      error: 'Internal server error fetching feed',
    });
  }
}
