import { Request, Response } from 'express';
import { schedulerEngine } from '../agent/scheduler';
import { WriterEngine } from '../agent/writer';
import { prisma } from '../database/prisma';
import { DiscoveredTopic, EditorialEvaluation, Persona } from '../models/types';
import { OpenAIService } from '../services/openai';
import { Logger } from '../utils/logger';

export async function handleAgentList(req: Request, res: Response) {
  try {
    let agents = await prisma.agent.findMany({
      include: {
        _count: {
          select: { posts: true, memories: true, logs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-initialize default agent if database has no active agents
    if (agents.length === 0) {
      try {
        const defaultAgent = await prisma.agent.create({
          data: {
            name: 'Ada',
            domain: 'AI & LLM Security',
            role: 'Senior AI Threat Intelligence Researcher',
            style: 'technical, concise, analytical, skeptical, evidence-based, educational',
            status: 'ACTIVE',
            isActive: true,
            currentTask: 'Starting autonomous agent',
          } as any,
        });

        // Trigger scheduler for default agent
        schedulerEngine.startAgentScheduler(defaultAgent.id).catch(err => {
          Logger.error('Failed starting scheduler for default agent', err);
        });

        agents = await prisma.agent.findMany({
          include: {
            _count: {
              select: { posts: true, memories: true, logs: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (createError) {
        Logger.error('Error auto-creating default agent', createError);
      }
    }

    return res.status(200).json({ agents });
  } catch (error) {
    Logger.error('Failed to list agents', error);
    return res.status(200).json({ agents: [], warning: 'Database initializing or empty' });
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
        posts: { orderBy: { publishedAt: 'desc' } },
        missions: { orderBy: { createdAt: 'desc' }, take: 1 },
        attempts: { where: { finalDecision: { in: ['REJECTED', 'REJECTED_FACTS', 'REJECTED_CRITIC'] } } },
        _count: { select: { posts: true, memories: true, logs: true } },
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const posts = agent.posts || [];
    const totalApproved = posts.length;
    const totalRejected = agent.attempts ? agent.attempts.length : 0;
    const totalGenerated = totalApproved + totalRejected;

    let avgQuality = 90;
    let avgAccuracy = 92;
    let avgOriginality = 88;

    if (posts.length > 0) {
      const qSum = posts.reduce((sum: number, p: any) => sum + (p.overallQuality ?? 90), 0);
      const aSum = posts.reduce((sum: number, p: any) => sum + (p.accuracyScore ?? 92), 0);
      const oSum = posts.reduce((sum: number, p: any) => sum + (p.originalityScore ?? 88), 0);
      avgQuality = Math.round(qSum / posts.length);
      avgAccuracy = Math.round(aSum / posts.length);
      avgOriginality = Math.round(oSum / posts.length);
    }

    const totalRewriteAttempts = posts.reduce((sum: number, p: any) => sum + (p.rewriteAttempts ?? 0), 0);

    // Calculate most used angle
    const angleCounts: Record<string, number> = {};
    posts.forEach((p: any) => {
      const angle = p.contentAngle || 'Technical Explanation';
      angleCounts[angle] = (angleCounts[angle] || 0) + 1;
    });

    let mostUsedAngle = 'Technical Explanation';
    let maxCount = 0;
    Object.entries(angleCounts).forEach(([angle, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedAngle = angle;
      }
    });

    const latestMission = agent.missions[0] ? `${agent.missions[0].status}: ${agent.missions[0].result || 'Active Cycle'}` : 'Idle / Scheduled';

    return res.status(200).json({
      agent: {
        id: agent.id,
        name: agent.name,
        domain: agent.domain,
        role: agent.role,
        style: agent.style,
        status: (agent as any).status || 'ACTIVE',
        isActive: (agent as any).isActive ?? true,
        currentTask: (agent as any).currentTask || null,
        lastRunAt: (agent as any).lastRunAt || null,
        nextRunAt: (agent as any).nextRunAt || null,
        lastError: (agent as any).lastError || null,
        totalPosts: totalApproved,
        totalGenerated,
        totalApproved,
        totalRejected,
        avgQualityScore: avgQuality,
        avgAccuracyScore: avgAccuracy,
        avgOriginalityScore: avgOriginality,
        totalMemories: agent._count.memories,
        topicsCovered: agent._count.memories,
        mostUsedAngle,
        totalRewriteAttempts,
        currentMission: latestMission,
        lastPublishedAt: posts[0]?.publishedAt ? posts[0].publishedAt.toISOString() : null,
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

export async function handleAgentTrends(req: Request, res: Response) {
  try {
    const { agentId } = req.query;
    const whereClause = agentId && typeof agentId === 'string' ? { agentId } : {};

    const trends = await prisma.emergingTrend.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return res.status(200).json({ trends });
  } catch (error) {
    Logger.error('Failed to fetch trends', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function handleAgentOpportunities(req: Request, res: Response) {
  try {
    const { agentId } = req.query;
    const whereClause = agentId && typeof agentId === 'string' ? { agentId } : {};

    const opportunities = await prisma.opportunity.findMany({
      where: whereClause,
      include: {
        snapshots: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { opportunityScore: 'desc' },
      take: 10
    });

    return res.status(200).json({ opportunities });
  } catch (error) {
    Logger.error('Failed to fetch opportunities', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function handleAgentStop(req: Request, res: Response) {
  try {
    const { agentId } = req.body;
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid agentId in request body' });
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return res.status(404).json({ error: `Agent with ID ${agentId} not found` });
    }

    schedulerEngine.stopAgentScheduler(agentId);

    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        isActive: false,
        status: 'STOPPED',
        currentTask: null,
      } as any,
    });

    Logger.info(`Agent ${agent.name} (${agentId}) has been STOPPED`);

    return res.status(200).json({
      message: 'Agent stopped successfully',
      agent: updatedAgent,
    });
  } catch (error) {
    Logger.error('Failed to stop agent', error);
    return res.status(500).json({ error: 'Failed to stop agent' });
  }
}

export async function handleAgentResume(req: Request, res: Response) {
  try {
    const { agentId } = req.body;
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid agentId in request body' });
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return res.status(404).json({ error: `Agent with ID ${agentId} not found` });
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        isActive: true,
        status: 'ACTIVE',
        lastError: null,
        currentTask: 'Starting autonomous agent',
      } as any,
    });

    await schedulerEngine.startAgentScheduler(agentId);

    Logger.info(`Agent ${agent.name} (${agentId}) has been RESUMED`);

    return res.status(200).json({
      message: 'Agent resumed successfully',
      agent: updatedAgent,
    });
  } catch (error) {
    Logger.error('Failed to resume agent', error);
    return res.status(500).json({ error: 'Failed to resume agent' });
  }
}

export async function handleAgentActive(req: Request, res: Response) {
  try {
    const activeAgents = await (prisma.agent as any).findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const agents = activeAgents.map((a: any) => ({
      id: a.id,
      name: a.name,
      domain: a.domain,
      role: a.role,
      status: a.status || 'ACTIVE',
      isActive: a.isActive ?? true,
      currentTask: a.currentTask || null,
      postsGenerated: a._count?.posts || 0,
      lastRunAt: a.lastRunAt || null,
      nextRunAt: a.nextRunAt || null,
      lastError: a.lastError || null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return res.status(200).json({
      count: agents.length,
      agents,
    });
  } catch (error) {
    Logger.error('Failed to fetch active agents', error);
    return res.status(500).json({ count: 0, agents: [], error: 'Failed to fetch active agents' });
  }
}
