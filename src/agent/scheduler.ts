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

    // Prevent duplicate scheduler jobs for the same agent
    if (this.activeJobs.has(agentId)) {
      Logger.warn(`Scheduler job already active for agent ${agentId}. Skipping duplicate scheduler creation.`, agentId);
      return;
    }

    // Run immediate discovery and publishing cycle on startup
    setImmediate(() => {
      this.runCycleForAgent(agentId).catch(err => {
        Logger.error(`Error during immediate cycle execution for agent ${agentId}`, err, agentId);
      });
    });

    // Schedule background cron recurring job
    const task = cron.schedule(config.cronSchedule, async () => {
      Logger.info(`Cron trigger fired for agent ${agentId}`, agentId);
      await this.runCycleForAgent(agentId).catch(err => {
        Logger.error(`Error in scheduled cron cycle for agent ${agentId}`, err, agentId);
      });
    });

    this.activeJobs.set(agentId, task);
    Logger.info(`Registered background cron job (${config.cronSchedule}) for agent ${agentId}`, agentId);
  }

  stopAgentScheduler(agentId: string): void {
    const task = this.activeJobs.get(agentId);
    if (task) {
      task.stop();
      this.activeJobs.delete(agentId);
      Logger.info(`Stopped background cron job for agent ${agentId}`, agentId);
    }
  }

  private async updateCurrentTask(agentId: string, currentTask: string): Promise<void> {
    try {
      await prisma.agent.update({
        where: { id: agentId },
        data: { currentTask },
      });
    } catch (e) {
      Logger.warn(`Failed to update currentTask for agent ${agentId}: ${e}`);
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

      // Record cycle start in database
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: 'ACTIVE',
          isActive: true,
          lastRunAt: new Date(),
          currentTask: 'Researching emerging topics',
          lastError: null,
        },
      });

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
      await this.updateCurrentTask(agentId, 'Researching emerging topics');
      const candidateTopics = await this.discoveryEngine.discoverAllTopics(agentId);

      if (candidateTopics.length === 0) {
        Logger.warn('No candidate topics discovered in current cycle.', agentId);
        await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "No topics found" } });
        
        const nextRunAt = new Date(Date.now() + 30 * 60 * 1000);
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            status: 'ACTIVE',
            isActive: true,
            currentTask: 'Waiting for next scheduled cycle',
            nextRunAt,
          },
        });
        return { publishedCount: 0 };
      }
      
      // STEP 2: Group Related Signals & Detect Emerging Trend
      Logger.info('MISSION STAGE: COLLECT SIGNALS & CONNECT SIGNALS', agentId);
      await this.updateCurrentTask(agentId, 'Collecting technical signals');
      const emergingTrend = await this.threatEngine.detectEmergingTrend(agentId, candidateTopics);
      
      // OP OPPORTUNITY RADAR
      Logger.info('MISSION STAGE: ANALYZE OPPORTUNITY & PREDICT TREND', agentId);
      await this.updateCurrentTask(agentId, 'Analyzing opportunities');
      const opportunity = await this.threatEngine.detectOpportunity(agentId, candidateTopics);
      
      if (!emergingTrend || !opportunity) {
        Logger.warn('Failed to detect any emerging trends or opportunities.', agentId);
        await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "No trends detected" } });
        
        const nextRunAt = new Date(Date.now() + 30 * 60 * 1000);
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            status: 'ACTIVE',
            isActive: true,
            currentTask: 'Waiting for next scheduled cycle',
            nextRunAt,
          },
        });
        return { publishedCount: 0 };
      }

      await this.updateCurrentTask(agentId, 'Detecting emerging trends');
      
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
      
      let dbOpportunity = await prisma.opportunity.findFirst({
        where: { agentId, topic: opportunity.topic }
      });
      if (dbOpportunity) {
        dbOpportunity = await prisma.opportunity.update({
          where: { id: dbOpportunity.id },
          data: {
            opportunityScore: opportunity.opportunityScore,
            momentum: opportunity.momentum,
            aiSecurityRelevance: opportunity.aiSecurityRelevance,
            novelty: opportunity.novelty,
            coverageLevel: opportunity.coverageLevel,
            trendPotential: opportunity.trendPotential,
            trendState: opportunity.trendState,
            workflowState: opportunity.workflowState,
            recommendation: opportunity.recommendation,
            explanation: opportunity.explanation,
            sourcesCount: opportunity.sourcesCount,
            signals: JSON.stringify(opportunity.signals.map(s => s.topic.title)),
          }
        });
      } else {
        dbOpportunity = await prisma.opportunity.create({
          data: {
            agentId,
            topic: opportunity.topic,
            opportunityScore: opportunity.opportunityScore,
            momentum: opportunity.momentum,
            aiSecurityRelevance: opportunity.aiSecurityRelevance,
            novelty: opportunity.novelty,
            coverageLevel: opportunity.coverageLevel,
            trendPotential: opportunity.trendPotential,
            trendState: opportunity.trendState,
            workflowState: opportunity.workflowState,
            recommendation: opportunity.recommendation,
            explanation: opportunity.explanation,
            sourcesCount: opportunity.sourcesCount,
            signals: JSON.stringify(opportunity.signals.map(s => s.topic.title)),
          }
        });
      }

      await prisma.trendSnapshot.create({
        data: {
          opportunityId: dbOpportunity.id,
          opportunityScore: opportunity.opportunityScore,
          momentum: opportunity.momentum,
          sourcesCount: opportunity.sourcesCount,
          trendState: opportunity.trendState
        }
      });

      Logger.info('MISSION STAGE: DETECT TREND', agentId);
      Logger.info(`Emerging Threat Score: ${emergingTrend.confidence}/100. Supporting sources: ${emergingTrend.supportingSources}`, agentId);
      Logger.info(`Opportunity Score: ${opportunity.opportunityScore}/100 (${opportunity.recommendation})`, agentId);

      if (opportunity.recommendation !== "CREATE CONTENT" && opportunity.recommendation !== "PREPARE DRAFT") {
         Logger.info(`Opportunity recommendation is ${opportunity.recommendation}. Skipping content creation.`, agentId);
         await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "Opportunity Monitored" } });
         
         const nextRunAt = new Date(Date.now() + 30 * 60 * 1000);
         await prisma.agent.update({
           where: { id: agentId },
           data: {
             status: 'ACTIVE',
             isActive: true,
             currentTask: 'Waiting for next scheduled cycle',
             nextRunAt,
           },
         });
         return { publishedCount: 0 };
      }

      // STEP 3: Memory Check & Security Evaluation
      Logger.info('MISSION STAGE: MEMORY CHECK & EVALUATE', agentId);
      await this.updateCurrentTask(agentId, 'Checking agent memory');
      const signalTopics = opportunity.signals.map(s => s.topic);
      const evaluation = await this.editorialEngine.evaluateTopics(agentId, persona, signalTopics);
      const approvedEvaluations = evaluation.filter(e => e.passed);

      // STEP 4: Generate Post, Self-Critique & Publish
      if (approvedEvaluations.length > 0) {
        const topCandidate = approvedEvaluations[0];
        Logger.info('MISSION STAGE: CREATE & SELF-CRITIQUE', agentId);
        await this.updateCurrentTask(agentId, 'Generating content');
        await this.updateCurrentTask(agentId, 'Self-critiquing content');
        
        const post = await this.writerEngine.createAndPublishPost(agentId, persona, topCandidate.topic, topCandidate);
        if (post) {
          publishedCount++;
          Logger.info('MISSION STAGE: PUBLISH & REMEMBER', agentId);
          await this.updateCurrentTask(agentId, 'Publishing content');
          await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "Published: " + post.title } });
        } else {
          Logger.warn('Post was rejected after self-critique retries.', agentId);
          await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "Filtered: Failed self-critique" } });
        }
      } else {
        Logger.info('Emerging trend topics filtered by editorial memory or quality thresholds.', agentId);
        await prisma.mission.update({ where: { id: mission.id }, data: { status: "COMPLETED", result: "Filtered by Editorial" } });
      }

      // Update cycle complete state
      const nextRunAt = new Date(Date.now() + 30 * 60 * 1000);
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: 'ACTIVE',
          isActive: true,
          currentTask: 'Waiting for next scheduled cycle',
          nextRunAt,
        },
      });

      Logger.info(`=== COMPLETED AUTONOMOUS MISSION FOR AGENT ${agent.name} ===`, agentId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`Autonomous cycle failed for agent ${agentId}`, error, agentId);
      
      try {
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            status: 'ERROR',
            isActive: false,
            currentTask: null,
            lastError: errorMessage,
          },
        });
        this.stopAgentScheduler(agentId);
      } catch (dbErr) {
        Logger.error(`Failed to persist error state for agent ${agentId}`, dbErr);
      }
    } finally {
      this.runningAgents.delete(agentId);
    }

    return { publishedCount };
  }

  async resumeAllActiveSchedulers(): Promise<void> {
    try {
      const agents = await prisma.agent.findMany({
        where: {
          isActive: true,
          status: "ACTIVE"
        },
        select: { id: true }
      });
      Logger.info(`Found ${agents.length} active agent(s) in database to resume schedulers.`);
      for (const a of agents) {
        await this.startAgentScheduler(a.id);
      }
    } catch (error) {
      Logger.error('Failed to resume active schedulers from database', error);
    }
  }
}

export const schedulerEngine = new SchedulerEngine();
