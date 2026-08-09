import cron from 'node-cron';
import { config } from '../config';
import { prisma } from '../database/prisma';
import { Persona } from '../models/types';
import { Logger } from '../utils/logger';
import { EditorialEngine } from './editorial';
import { TopicDiscoveryEngine } from './topicDiscovery';
import { WriterEngine } from './writer';
import { ThreatIntelligenceEngine } from './threatIntelligence';

export class SchedulerEngine {
  private discoveryEngine: TopicDiscoveryEngine;
  private editorialEngine: EditorialEngine;
  private writerEngine: WriterEngine;
  private threatEngine: ThreatIntelligenceEngine;
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();
  private runningAgents: Set<string> = new Set();

  constructor() {
    this.discoveryEngine = new TopicDiscoveryEngine();
    this.editorialEngine = new EditorialEngine();
    this.writerEngine = new WriterEngine();
    this.threatEngine = new ThreatIntelligenceEngine();
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

      Logger.info(`=== STARTING AUTONOMOUS MISSION FOR AGENT ${agent.name} (${agent.domain}) ===`, agentId);
      
      const mission = await prisma.mission.create({
        data: { agentId, status: "RUNNING" }
      });

      // STEP 1: Discover Topics & Normalize
      Logger.info('MISSION STAGE: RESEARCH (Scanning AI Security sources)', agentId);
      const candidateTopics = await this.discoveryEngine.discoverAllTopics(agentId);

      if (candidateTopics.length === 0) {
        Logger.warn('No candidate topics discovered in current cycle.', agentId);
        await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "No topics found" } });
        return { publishedCount: 0 };
      }
      
      // STEP 2: Group Related Signals & Detect Emerging Trend
      Logger.info('MISSION STAGE: COLLECT SIGNALS & CONNECT SIGNALS', agentId);
      const emergingTrend = await this.threatEngine.detectEmergingTrend(agentId, candidateTopics);
      
      if (!emergingTrend) {
        Logger.warn('Failed to detect any emerging trends.', agentId);
        await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "No trends detected" } });
        return { publishedCount: 0 };
      }
      
      // Save Trend
      await prisma.emergingTrend.create({
        data: {
          agentId,
          title: emergingTrend.title,
          confidence: emergingTrend.confidence,
          securityScore: emergingTrend.securityScore,
          novelty: emergingTrend.novelty,
          impact: emergingTrend.impact,
          timeliness: emergingTrend.timeliness,
          sourceDiversity: emergingTrend.sourceDiversity,
          supportingSources: emergingTrend.supportingSources,
          signals: JSON.stringify(emergingTrend.signals.map(s => s.topic.title)),
        }
      });
      
      Logger.info('MISSION STAGE: DETECT TREND', agentId);
      Logger.info(`Emerging Threat Score: ${emergingTrend.confidence}/100. Supporting sources: ${emergingTrend.supportingSources}`, agentId);

      // STEP 3: Memory Check & Security Evaluation
      Logger.info('MISSION STAGE: MEMORY CHECK & EVALUATE', agentId);
      const signalTopics = emergingTrend.signals.map(s => s.topic);
      const evaluation = await this.editorialEngine.evaluateTopics(agentId, persona, signalTopics);
      const approvedEvaluations = evaluation.filter(e => e.passed);

      // STEP 4: Generate Post, Self-Critique & Publish
      if (approvedEvaluations.length > 0) {
        const topCandidate = approvedEvaluations[0];
        Logger.info('MISSION STAGE: CREATE & SELF-CRITIQUE', agentId);
        const post = await this.writerEngine.createAndPublishPost(agentId, persona, topCandidate.topic, topCandidate);
        if (post) {
          publishedCount++;
          Logger.info('MISSION STAGE: PUBLISH & REMEMBER', agentId);
          await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "Published: " + post.title } });
        } else {
          Logger.warn('Post was rejected after self-critique retries.', agentId);
          await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "Filtered: Failed self-critique" } });
        }
      } else {
        Logger.info('Emerging trend topics filtered by editorial memory or quality thresholds.', agentId);
        await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "Filtered by Editorial" } });
      }

      Logger.info(`=== COMPLETED AUTONOMOUS MISSION FOR AGENT ${agent.name} ===`, agentId);
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
