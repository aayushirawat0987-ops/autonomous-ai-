import { DiscoveredTopic } from '../models/types';
import { Logger } from '../utils/logger';

export interface Signal {
  topic: DiscoveredTopic;
  relevance: number;
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
