import { DiscoveredTopic } from '../models/types';
import { Logger } from '../utils/logger';

export interface Signal {
  topic: DiscoveredTopic;
  relevance: number;
}

export interface OpportunityResult {
  topic: string;
  opportunityScore: number;
  momentum: number;
  aiSecurityRelevance: number;
  novelty: number;
  coverageLevel: string;
  trendPotential: number;
  trendState: string;
  workflowState: string;
  recommendation: string;
  explanation: string;
  sourcesCount: number;
  signals: Signal[];
}

export interface DetectedTrend {
  title: string;
  signals: Signal[];
  confidence: number;
  securityScore: number;
  novelty: number;
  impact: number;
  timeliness: number;
  sourceDiversity: number;
  supportingSources: number;
  isPublished: boolean;
}

export class ThreatIntelligenceEngine {
  async detectOpportunity(agentId: string, topics: DiscoveredTopic[]): Promise<OpportunityResult | null> {
    Logger.info(`Analyzing ${topics.length} signals for opportunity radar...`, agentId);
    
    if (topics.length === 0) return null;

    // Group related signals
    const groups: { [key: string]: Signal[] } = {};
    for (const t of topics) {
      const cleanTitle = t.title.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      const keywords = cleanTitle.split(/\s+/).filter(w => w.length > 4);
      let matchedGroup = false;
      for (const [key, group] of Object.entries(groups)) {
        const groupKeywords = key.split(',');
        const overlap = keywords.filter(k => groupKeywords.includes(k)).length;
        if (overlap >= 2) {
          group.push({ topic: t, relevance: Math.min(100, 75 + overlap * 5) });
          matchedGroup = true;
          break;
        }
      }
      if (!matchedGroup) {
        groups[keywords.slice(0, 4).join(',')] = [{ topic: t, relevance: 90 }];
      }
    }

    let bestGroup: Signal[] = [];
    for (const group of Object.values(groups)) {
      if (group.length > bestGroup.length) {
        bestGroup = group;
      }
    }
    
    if (bestGroup.length === 0) {
        bestGroup = topics.slice(0, 1).map(t => ({ topic: t, relevance: 85 }));
    }

    const uniqueSources = new Set(bestGroup.map(s => s.topic.source)).size;
    const sourcesCount = bestGroup.length;
    
    // Calculate metrics
    const momentum = Math.min(100, sourcesCount * 15 + uniqueSources * 10);
    const aiSecurityRelevance = Math.min(100, 80 + (sourcesCount * 3));
    const novelty = Math.min(100, 80 + uniqueSources * 2);
    
    let coverageLevel = "Low";
    if (sourcesCount >= 5) coverageLevel = "High";
    else if (sourcesCount >= 3) coverageLevel = "Medium";

    const trendPotential = Math.min(100, momentum * 0.4 + aiSecurityRelevance * 0.4 + novelty * 0.2);
    const opportunityScore = Math.min(100, trendPotential * 0.8 + (coverageLevel === 'Low' ? 20 : coverageLevel === 'Medium' ? 10 : 0));
    
    let trendState = "Stable";
    if (momentum > 85) trendState = "Rapidly Growing";
    else if (momentum > 70) trendState = "Emerging";
    else if (momentum > 50) trendState = "Growing";
    else if (momentum < 30) trendState = "Declining";

    let workflowState = "Discovered";
    let recommendation = "MONITOR";
    if (opportunityScore >= 80) {
      workflowState = "High Opportunity";
      recommendation = "CREATE CONTENT";
    } else if (opportunityScore >= 65) {
      workflowState = "Emerging";
      recommendation = "PREPARE DRAFT";
    } else if (opportunityScore >= 50) {
      workflowState = "Monitoring";
    }

    const representativeTopic = bestGroup[0].topic;
    const topicName = representativeTopic.title.split('-')[0].trim();
    
    // AI Explanation (deterministic fallback based on signals)
    const explanation = `This topic shows a ${trendState.toLowerCase()} trend with a momentum of ${Math.round(momentum)}. It is highly relevant to AI security (${Math.round(aiSecurityRelevance)}/100) and currently has ${coverageLevel.toLowerCase()} coverage across ${sourcesCount} sources. This presents a strong opportunity for novel content creation.`;

    return {
      topic: topicName,
      opportunityScore: Math.round(opportunityScore),
      momentum: Math.round(momentum),
      aiSecurityRelevance: Math.round(aiSecurityRelevance),
      novelty: Math.round(novelty),
      coverageLevel,
      trendPotential: Math.round(trendPotential),
      trendState,
      workflowState,
      recommendation,
      explanation,
      sourcesCount,
      signals: bestGroup.slice(0, 10),
    };
  }

  async detectEmergingTrend(agentId: string, topics: DiscoveredTopic[]): Promise<DetectedTrend | null> {
    Logger.info(`Analyzing ${topics.length} signals for emerging threat trends...`, agentId);
    
    if (topics.length === 0) return null;

    // Group related signals
    const groups: { [key: string]: Signal[] } = {};
    for (const t of topics) {
      const cleanTitle = t.title.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      const keywords = cleanTitle.split(/\s+/).filter(w => w.length > 4);
      let matchedGroup = false;
      for (const [key, group] of Object.entries(groups)) {
        const groupKeywords = key.split(',');
        const overlap = keywords.filter(k => groupKeywords.includes(k)).length;
        if (overlap >= 2) {
          group.push({ topic: t, relevance: Math.min(100, 75 + overlap * 5) });
          matchedGroup = true;
          break;
        }
      }
      if (!matchedGroup) {
        groups[keywords.slice(0, 4).join(',')] = [{ topic: t, relevance: 90 }];
      }
    }
    
    let bestGroup: Signal[] = [];
    for (const group of Object.values(groups)) {
      if (group.length > bestGroup.length) {
        bestGroup = group;
      }
    }
    
    if (bestGroup.length === 0) {
        bestGroup = topics.slice(0, 1).map(t => ({ topic: t, relevance: 85 }));
    }

    const uniqueSources = new Set(bestGroup.map(s => s.topic.source)).size;
    const supportingSources = bestGroup.length;
    
    // Deterministic Score Calculations
    const sourceDiversityScore = Math.min(100, uniqueSources * 25 + 20); // 1 source = 45, 2=70, 3=95
    const securityScore = Math.min(100, 80 + (supportingSources * 3));
    const novelty = Math.min(100, 80 + uniqueSources * 2);
    const impact = Math.min(100, 75 + supportingSources * 4);
    const timeliness = 95; // usually fresh feeds
    const confidence = Math.round((securityScore + sourceDiversityScore + impact) / 3);
    
    const representativeTopic = bestGroup[0].topic;
    const trendTitle = `Emerging Trend: ${representativeTopic.title.split('-')[0].trim()}`;

    const trend: DetectedTrend = {
      title: trendTitle,
      signals: bestGroup.slice(0, 10), // cap at 10 to avoid huge payloads
      confidence,
      securityScore,
      novelty,
      impact,
      timeliness,
      sourceDiversity: sourceDiversityScore,
      supportingSources,
      isPublished: false
    };

    Logger.info(`Detected Emerging Trend: "${trend.title}" supported by ${supportingSources} signals. Confidence: ${confidence}%`, agentId);
    return trend;
  }
}
