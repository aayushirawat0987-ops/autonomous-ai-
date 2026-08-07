import { Request, Response } from 'express';
import { schedulerEngine } from '../agent/scheduler';
import { prisma } from '../database/prisma';
import { Logger } from '../utils/logger';

export async function handleAgentInit(req: Request, res: Response) {
  try {
    const { persona } = req.body;

    if (!persona || !persona.name || !persona.domain) {
      return res.status(400).json({
        error: 'Invalid request payload. Must provide persona object with name and domain.',
      });
    }

    const name: string = persona.name.trim();
    const domain: string = persona.domain.trim();
    const role: string = persona.role || `${domain} Researcher`;
    const style: string = persona.style || 'technical, concise, analytical, skeptical, evidence-based, educational';

    // Save agent and persona to SQLite Database
    const agent = await prisma.agent.create({
      data: {
        name,
        domain,
        role,
        style,
      },
    });

    Logger.info(`Agent "${agent.name}" (${agent.domain}) initialized with ID ${agent.id}`);

    // Start background autonomous scheduler
    await schedulerEngine.startAgentScheduler(agent.id);

    return res.status(201).json({
      agentId: agent.id,
    });
  } catch (error) {
    Logger.error('Failed to initialize agent', error);
    return res.status(500).json({
      error: 'Internal server error initializing agent',
    });
  }
}
