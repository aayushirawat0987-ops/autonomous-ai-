export interface Persona {
  name: string;
  domain: string;
  role?: string;
  style?: string;
}

export interface DiscoveredTopic {
  title: string;
  url: string;
  source: string;
  summary: string;
  publishedAt: string; // ISO 8601 UTC
}

export interface EditorialScores {
  relevance: number;       // 0-100 (AI Security domain relevance)
  novelty: number;         // 0-100
  impact: number;          // 0-100
  timeliness: number;      // 0-100
  duplicateScore: number;  // 0-100 (higher means duplicate)
}

export interface EditorialEvaluation {
  topic: DiscoveredTopic;
  scores: EditorialScores;
  totalScore: number;      // 0-100 scale, must be > 80 to pass
  passed: boolean;         // totalScore > 80 && relevance >= 70 && duplicateScore < 30
  rejectionReason?: string;
}

export interface GeneratedPost {
  title: string;
  content: string;         // LinkedIn/X style post (100–250 words)
  rationale: string;
  whySelected: string;
  whyRelevantNow: string;
  sources: string[];
}

export interface FactCheckResult {
  passed: boolean;
  confidence: number;
  issues: string[];
  corrections: string[];
}

export interface CriticScores {
  relevance: number;
  originality: number;
  clarity: number;
  engagement: number;
  factualQuality: number;
  safety: number;
  overallScore: number;
}

export interface CriticResult {
  passed: boolean;
  scores: CriticScores;
  weaknesses: string[];
  improvementSuggestions: string[];
}
