import { Request, Response } from 'express';
import { schedulerEngine } from '../agent/scheduler';
import { WriterEngine } from '../agent/writer';
import { prisma } from '../database/prisma';
import { DiscoveredTopic, EditorialEvaluation, Persona } from '../models/types';
import { OpenAIService } from '../services/openai';
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

const writerEngine = new WriterEngine();
const openaiService = new OpenAIService();

export async function handleAgentPostGenerate(req: Request, res: Response) {
  try {
    const { agentId, topic, postType, platform, tone, instructions } = req.body;
    if (!agentId || !topic) {
      return res.status(400).json({ error: 'Missing required fields: agentId and topic' });
    }

    const post = await writerEngine.generateManualPost(
      agentId,
      topic,
      postType,
      platform,
      tone,
      instructions
    );

    return res.status(201).json({ post });
  } catch (error) {
    Logger.error('Failed to generate post for agent', error);
    return res.status(500).json({ error: (error as Error).message || 'Failed to generate post' });
  }
}

export async function handlePostUpdate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, content, platform, status } = req.body;

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let updated;
    try {
      updated = await prisma.post.update({
        where: { id },
        data: {
          title: title !== undefined ? title : existing.title,
          content: content !== undefined ? content : existing.content,
          platform: platform !== undefined ? platform : (existing as any).platform || 'LinkedIn / X',
          status: status !== undefined ? status : (existing as any).status || 'Published',
        } as any,
      });
    } catch (e) {
      updated = await prisma.post.update({
        where: { id },
        data: {
          title: title !== undefined ? title : existing.title,
          content: content !== undefined ? content : existing.content,
        },
      });
    }

    return res.status(200).json({ post: updated });
  } catch (error) {
    Logger.error('Failed to update post', error);
    return res.status(500).json({ error: 'Failed to update post' });
  }
}

export async function handlePostDelete(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await prisma.post.delete({ where: { id } });
    return res.status(200).json({ success: true, deletedId: id, agentId: existing.agentId });
  } catch (error) {
    Logger.error('Failed to delete post', error);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
}

export async function handlePostRegenerate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.post.findUnique({
      where: { id },
      include: { agent: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const persona: Persona = {
      name: existing.agent.name,
      domain: existing.agent.domain,
      role: existing.agent.role,
      style: existing.agent.style,
    };

    const topic: DiscoveredTopic = {
      title: existing.title,
      url: existing.topicUrl || `https://autonomous.agent/post-${existing.id}`,
      source: existing.topicSource || 'Regeneration Request',
      summary: existing.content.slice(0, 300),
      publishedAt: existing.publishedAt.toISOString(),
    };

    const evaluation: EditorialEvaluation = {
      topic,
      scores: { relevance: 95, novelty: 90, impact: 90, timeliness: 95, duplicateScore: 5 },
      totalScore: 92,
      overallScore: 92,
      passed: true,
    };

    const newDraft = await openaiService.generatePost(persona, topic, evaluation);

    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: newDraft.title || existing.title,
        content: newDraft.content || existing.content,
        rationale: newDraft.rationale || existing.rationale,
        whySelected: newDraft.whySelected || existing.whySelected,
        whyRelevantNow: newDraft.whyRelevantNow || existing.whyRelevantNow,
      },
    });

    Logger.info(`REGENERATED POST #${id} FOR AGENT ${existing.agent.name}`, existing.agentId);

    return res.status(200).json({ post: updated });
  } catch (error) {
    Logger.error('Failed to regenerate post', error);
    return res.status(500).json({ error: 'Failed to regenerate post' });
  }
}

export async function handlePostPublish(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let updated;
    try {
      updated = await prisma.post.update({
        where: { id },
        data: {
          status: 'Published',
        } as any,
      });
    } catch (e) {
      updated = await prisma.post.findUnique({ where: { id } });
    }
    return res.status(200).json({ post: updated });
  } catch (error) {
    Logger.error('Failed to publish post', error);
    return res.status(500).json({ error: 'Failed to publish post' });
  }
}

export async function handleAgentMission(req: Request, res: Response) {
  try {
    const { agentId } = req.query;
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Missing agentId' });
    }

    const mission = await prisma.mission.findFirst({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });

    const trend = await prisma.emergingTrend.findFirst({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ mission, trend });
  } catch (error) {
    Logger.error('Failed to fetch mission state', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
