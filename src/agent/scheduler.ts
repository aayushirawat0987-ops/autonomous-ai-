import cron from 'node-cron';
import { config } from '../config';
import { prisma } from '../database/prisma';
import { Persona } from '../models/types';
import { Logger } from '../utils/logger';
import { EditorialEngine } from './editorial';
import { TopicDiscoveryEngine } from './topicDiscovery';
import { WriterEngine } from './writer';

export class SchedulerEngine {
  private discoveryEngine: TopicDiscoveryEngine;
  private editorialEngine: EditorialEngine;
  private writerEngine: WriterEngine;
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();
  private runningAgents: Set<string> = new Set();

  constructor() {
    this.discoveryEngine = new TopicDiscoveryEngine();
    this.editorialEngine = new EditorialEngine();
    this.writerEngine = new WriterEngine();
  }

  async startAgentScheduler(agentId: string): Promise<void> {
    Logger.info(`Initializing background scheduler for agent ${agentId}...`, agentId);

    // Run immediate discovery and publishing cycle on startup
    setImmediate(() => {
      this.runCycleForAgent(agentId).catch(err => {
        Logger.error(`Error during immediate cycle execution for agent ${agentId}`, err, agentId);
      });
    });

    // Schedule background cron recurring job
    if (!this.activeJobs.has(agentId)) {
      const task = cron.schedule(config.cronSchedule, async () => {
        Logger.info(`Cron trigger fired for agent ${agentId}`, agentId);
        await this.runCycleForAgent(agentId).catch(err => {
          Logger.error(`Error in scheduled cron cycle for agent ${agentId}`, err, agentId);
        });
      });

      this.activeJobs.set(agentId, task);
      Logger.info(`Registered background cron job (${config.cronSchedule}) for agent ${agentId}`, agentId);
    }
  }

  async runCycleForAgent(agentId: string): Promise<{ publishedCount: number }> {
    if (this.runningAgents.has(agentId)) {
      Logger.warn(`Cycle already in progress for agent ${agentId}. Skipping duplicate run.`, agentId);
      return { publishedCount: 0 };
    }

    this.runningAgents.add(agentId);
    let publishedCount = 0;

    try {
      // Fetch agent persona from DB
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent) {
        Logger.error(`Agent ${agentId} not found in database.`, undefined, agentId);
        return { publishedCount: 0 };
      }

      const persona: Persona = {
        name: agent.name,
        domain: agent.domain,
        role: agent.role,
        style: agent.style,
      };

      Logger.info(`=== STARTING AUTONOMOUS PUBLISHING CYCLE FOR AGENT ${agent.name} (${agent.domain}) ===`, agentId);

      // STEP 1: Discover Topics
      const candidateTopics = await this.discoveryEngine.discoverAllTopics(agentId);

      if (candidateTopics.length === 0) {
        Logger.warn('No candidate topics discovered in current cycle.', agentId);
        return { publishedCount: 0 };
      }

      // STEP 2 & 3 & 4: Editorial Evaluation, Rejection of Weak Topics, Memory Check
      const evaluations = await this.editorialEngine.evaluateTopics(agentId, persona, candidateTopics);

      // Filter passed topics
      const approvedEvaluations = evaluations.filter(e => e.passed);
      Logger.info(`Editorial review complete. ${approvedEvaluations.length} of ${evaluations.length} topics approved.`, agentId);

      // STEP 5 & 6: Generate Post and Save to Database
      // Pick top approved candidate (highest aggregate score)
      if (approvedEvaluations.length > 0) {
        approvedEvaluations.sort((a, b) => b.totalScore - a.totalScore);
        const topCandidate = approvedEvaluations[0];
        
        Logger.info(`Topic selected for content generation: "${topCandidate.topic.title}" (Score: ${topCandidate.totalScore})`, agentId);

        await this.writerEngine.createAndPublishPost(agentId, persona, topCandidate.topic, topCandidate);
        publishedCount++;
      } else {
        Logger.info('No topics passed editorial quality thresholds during this cycle.', agentId);
      }

      Logger.info(`=== COMPLETED AUTONOMOUS PUBLISHING CYCLE FOR AGENT ${agent.name} ===`, agentId);
    } catch (error) {
      Logger.error(`Autonomous cycle failed for agent ${agentId}`, error, agentId);
    } finally {
      this.runningAgents.delete(agentId);
    }

    return { publishedCount };
  }

  async resumeAllActiveSchedulers(): Promise<void> {
    try {
      const agents = await prisma.agent.findMany({ select: { id: true } });
      for (const a of agents) {
        await this.startAgentScheduler(a.id);
      }
    } catch (error) {
      Logger.error('Failed to resume active schedulers from database', error);
    }
  }
}

export const schedulerEngine = new SchedulerEngine();
