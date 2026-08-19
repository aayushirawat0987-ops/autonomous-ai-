import { TopicProfile } from '../models/types';
import { classifyTopicCategory } from '../services/openai';

export function createTopicProfile(requestedTopic: string, summary: string = ''): TopicProfile {
  const normalized = requestedTopic.trim().replace(/^🚨\s*/, '').replace(/\s+/g, ' ');
  const category = classifyTopicCategory(normalized, summary);

  let primarySubject = normalized;
  let coreConcepts: string[] = [];
  let unrelatedTopics: string[] = [];

  if (category === 'High-Performance Computing') {
    primarySubject = 'Large-scale high-performance computing systems and parallel processing architectures';
    coreConcepts = ['Parallel processing', 'HPC interconnects', 'CPUs & GPUs', 'FLOPS per watt', 'MPI latency', 'Scientific simulations'];
    unrelatedTopics = ['Prompt injection', 'LLM jailbreak', 'Vector database attack', 'Credential theft'];
  } else if (category === 'Quantum Computing') {
    primarySubject = 'Quantum computing hardware, qubit coherence, and quantum algorithm error correction';
    coreConcepts = ['Qubits & quantum gates', 'Superposition & entanglement', 'Fault-tolerant error correction', 'Quantum coherence times'];
    unrelatedTopics = ['Prompt injection', 'LLM security', 'Phishing', 'Vector databases'];
  } else if (category === 'Robotics') {
    primarySubject = 'Robotic systems, spatial AI perception, sensor fusion, and closed-loop motor control';
    coreConcepts = ['Sensors & perception', 'LiDAR & depth vision', 'Kinematics & actuation', 'Closed-loop feedback control'];
    unrelatedTopics = ['Prompt injection', 'LLM tokenization', 'Phishing'];
  } else if (category === 'Cloud Computing') {
    primarySubject = 'Cloud infrastructure, microservices, containerization, and distributed systems orchestration';
    coreConcepts = ['Containerization & Kubernetes', 'Microservice architecture', 'Infrastructure scaling', 'Resource isolation'];
    unrelatedTopics = ['Phishing', 'Prompt injection'];
  } else if (category === 'Software Development') {
    primarySubject = 'Software architecture, programming language runtimes, memory management, and code optimization';
    coreConcepts = ['Language syntax & runtimes', 'Memory allocation', 'Concurrency & performance profiling', 'Idiomatic design patterns'];
    unrelatedTopics = ['Credential theft', 'Prompt injection'];
  } else {
    primarySubject = `${normalized} technical architecture and practical engineering applications`;
    coreConcepts = ['Technical mechanics', 'System architecture', 'Performance metrics', 'Practical applications'];
    unrelatedTopics = ['Unrelated security attacks'];
  }

  return {
    requestedTopic: normalized,
    topicCategory: category,
    primarySubject,
    importantConcepts: coreConcepts,
    unrelatedConcepts: unrelatedTopics,
  };
}

const FORBIDDEN_INTERNAL_TEXT = [
  'User Manual Request',
  'Manual Request',
  'Manual post generation request',
  'system prompt',
  'developer prompt',
  'internal instruction',
  'agent instruction',
  'generation request',
  'API request',
  'JSON output',
  'database record',
  'the user asked',
  'as requested by the user',
  'according to the prompt',
  'as requested by prompt'
];

const FORBIDDEN_GENERIC_TEMPLATES = [
  'recent disclosures regarding',
  'recent empirical findings regarding',
  'technical topic request',
  'technical overview and analysis of',
  'recent technical analysis published by',
  'as technology systems evolve across',
  'modern compiler optimizations',
  'continuous application maintainability',
  'optimized execution pathways',
  "in today's rapidly evolving",
  'this marks a significant milestone',
  'the future of ai is here',
  'as ai continues to transform',
  'this is a game changer',
  'the possibilities are endless',
  'it is important to note that',
  'this highlights the importance of'
];

export function detectGenericFiller(content: string): string[] {
  const issues: string[] = [];
  const lower = (content || '').toLowerCase();

  for (const template of FORBIDDEN_GENERIC_TEMPLATES) {
    if (lower.includes(template)) {
      issues.push(`Generic template phrase detected: "${template}". Content must be 100% topic-specific.`);
    }
  }

  return issues;
}

export interface StructureValidationResult {
  valid: boolean;
  sanitizedContent: string;
  sanitizedTitle: string;
  issues: string[];
}

export function validateStructureAndSanitize(content: string, title: string): StructureValidationResult {
  const issues: string[] = [];
  let sanitizedContent = content || '';
  let sanitizedTitle = title || '';

  // 1. Remove duplicate title prefix from title if present
  sanitizedTitle = sanitizedTitle
    .replace(/^(Title|Headline):\s*/i, '')
    .replace(/^("|\s)+|("|\s)+$/g, '')
    .trim();

  // 2. Internal System Text Check
  const combinedText = `${sanitizedTitle} ${sanitizedContent}`;
  for (const forbidden of FORBIDDEN_INTERNAL_TEXT) {
    if (new RegExp(forbidden, 'i').test(combinedText)) {
      issues.push(`Internal system text leakage detected: "${forbidden}"`);
    }
  }

  // 3. Duplicate Heading Check (e.g. WHAT HAPPENED appearing 2+ times)
  const headings = ['HOOK', 'WHAT HAPPENED', 'WHAT IS IT', 'TECHNICAL EXPLANATION', 'TECHNICAL BREAKDOWN', 'WHY IT MATTERS', 'KEY TAKEAWAY', 'CONCLUSION'];
  for (const h of headings) {
    const matches = sanitizedContent.match(new RegExp(`\\b${h}\\b`, 'gi'));
    if (matches && matches.length > 1) {
      issues.push(`Duplicate section heading detected: "${h}" appears ${matches.length} times.`);
    }
  }

  // 4. Duplicate Paragraph Check
  const paragraphs = sanitizedContent.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);
  const seenParas = new Set<string>();
  for (const p of paragraphs) {
    const pClean = p.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenParas.has(pClean)) {
      issues.push(`Duplicate paragraph detected: "${p.slice(0, 40)}..."`);
    }
    seenParas.add(pClean);
  }

  // 5. Generic Template Filler Check
  const genericIssues = detectGenericFiller(sanitizedContent);
  if (genericIssues.length > 0) {
    issues.push(...genericIssues);
  }

  // 6. Clean up any remaining prompt leakage sentences
  sanitizedContent = sanitizedContent
    .replace(/^.*(?:User Manual Request|Manual post generation request|The user asked|According to the prompt|As requested by prompt).*\n?/gmi, '')
    .trim();

  const valid = issues.length === 0;

  return {
    valid,
    sanitizedContent,
    sanitizedTitle,
    issues,
  };
}
