import { Request, Response } from 'express';
import { schedulerEngine } from '../agent/scheduler';
import { prisma } from '../database/prisma';
import { Logger } from '../utils/logger';

export async function handleAgentList(req: Request, res: Response) {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        _count: {
          select: { posts: true, memories: true, logs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ agents });
  } catch (error) {
    Logger.error('Failed to list agents', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function handleAgentStatus(req: Request, res: Response) {
  try {
    const { agentId } = req.query;
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Missing agentId' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        posts: { orderBy: { publishedAt: 'desc' }, take: 1 },
        _count: { select: { posts: true, memories: true, logs: true } },
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.status(200).json({
      agent: {
        id: agent.id,
        name: agent.name,
        domain: agent.domain,
        role: agent.role,
        style: agent.style,
        totalPosts: agent._count.posts,
        totalMemories: agent._count.memories,
        lastPublishedAt: agent.posts[0]?.publishedAt ? agent.posts[0].publishedAt.toISOString() : null,
      },
    });
  } catch (error) {
    Logger.error('Failed to fetch agent status', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function handleAgentTrigger(req: Request, res: Response) {
  try {
    const { agentId } = req.body;
    if (!agentId) {
      return res.status(400).json({ error: 'Missing agentId in body' });
    }

    Logger.info(`Manual discovery cycle triggered for agent ${agentId}`);
    
    // Run cycle asynchronously
    const resultPromise = schedulerEngine.runCycleForAgent(agentId);
    
    // Return early acknowledgment or wait
    const result = await resultPromise;

    return res.status(200).json({
      message: 'Autonomous publishing cycle completed',
      agentId,
      publishedCount: result.publishedCount,
    });
  } catch (error) {
    Logger.error('Manual trigger failed', error);
    return res.status(500).json({ error: 'Failed to run discovery cycle' });
  }
}

export async function handleAgentLogs(req: Request, res: Response) {
  try {
    const { agentId } = req.query;
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Missing agentId' });
    }

    const logs = await prisma.agentLog.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.status(200).json({ logs });
  } catch (error) {
    Logger.error('Failed to fetch logs', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
