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
  overallScore?: number;   // 0-100 scale, alias for totalScore
  passed: boolean;         // totalScore > 80 && relevance >= 70 && duplicateScore < 30
  rejectionReason?: string;
}

export interface RequestClassification {
  coreTechnology: string;
  contentIntent: string;
  contentType: string;
  targetAudience: string;
  subjectX?: string;
  targetY?: string;
  isRelationshipQuery?: boolean;
}

export interface TopicProfile {
  requestedTopic: string;
  topicCategory: string;
  primarySubject: string;
  importantConcepts: string[];
  unrelatedConcepts: string[];
  requestClassification?: RequestClassification;
}

export interface TopicRelevanceResult {
  requestedTopic: string;
  actualMainTopic: string;
  topicCategory: string;
  relevanceScore: number;     // 0-100 (must be >= 85 to pass)
  topicCovered: boolean;
  topicDrift: boolean;
  unrelatedConcepts: string[];
  topicSpecificFacts: string[];
  approved: boolean;
  rejectionReason?: string;
}

export interface GeneratedPost {
  title: string;
  content: string;         // LinkedIn/X style post (200–300 words)
  topicCategory?: string;
  topicRelevanceScore?: number;
  contentAngle?: string;
  wordCount?: number;
  accuracyScore?: number;
  originalityScore?: number;
  technicalScore?: number;
  clarityScore?: number;
  evidenceScore?: number;
  overallQuality?: number;
  rationale: string;
  whySelected: string;
  whyRelevantNow: string;
  sources: string[];
}

export interface FactCheckResult {
  passed: boolean;
  verified: boolean;
  confidence: number;       // 0-100
  claimsChecked: string[];
  unsupportedClaims: string[];
  incorrectClaims: string[];
  missingContext: string[];
  sourceQuality: number;   // 0-100
  recommendations: string[];
  issues: string[];
  corrections: string[];
}

export interface CriticScores {
  accuracy: number;         // 25% weight
  clarity: number;          // 15% weight
  technicalKnowledge: number;// 15% weight
  originality: number;      // 15% weight
  usefulness: number;       // 10% weight
  evidenceQuality: number;  // 10% weight
  structure: number;        // 5% weight
  readability: number;      // 5% weight
  overallScore: number;     // 0-100 weighted
  relevance?: number;
  safety?: number;
  factualQuality?: number;
  engagement?: number;
}

export interface CriticResult {
  passed: boolean;
  scores: CriticScores;
  weaknesses: string[];
  improvementSuggestions: string[];
}

