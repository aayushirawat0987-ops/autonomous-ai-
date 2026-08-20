import { TopicProfile, RequestClassification, StructuredContentPlan } from '../models/types';
import { classifyTopicCategory } from '../services/openai';

export interface ParsedTopicInput {
  normalizedTopic: string;
  postType: string;
  format: string;
}

export function classifyUserRequest(rawInput: string): RequestClassification {
  let clean = (rawInput || '').trim();

  // Strip prefix labels
  clean = clean
    .replace(/^🚨\s*/, '')
    .replace(/^(?:AI\s*Security\s*Insight|arXiv Paper|GitHub Repository):\s*/i, '')
    .replace(/:\s*(?:Security Analysis|Technical Explanation|Common Misconception|Research Summary|Breaking Development)/gi, '')
    .trim();

  let coreTech = clean;
  let intent = 'Technical Breakdown & Overview';
  let contentType = 'Technical Article';
  let audience = 'Engineering & Technology Professionals';

  let subjectX: string | undefined;
  let targetY: string | undefined;
  let isRelationshipQuery = false;

  const lower = clean.toLowerCase();

  // 0. Check Relationship Pattern ("USE OF X IN Y", "ROLE OF X IN Y", "APPLICATIONS OF X IN Y", "HOW X IS USED IN Y", "X FOR Y DEVELOPMENT", "X IN Y")
  const relMatch = clean.match(/^(?:use\s+of|role\s+of|applications?\s+of|how\s+)?(.+?)\s+(?:is\s+used\s+in|in|for)\s+(.+?)(?:\s+development)?$/i);
  if (relMatch && !/\b(?:advantages?|benefits?|business impact|vulnerability|case study|misconception)\b/i.test(clean)) {
    let rawX = relMatch[1].trim();
    let rawY = relMatch[2].trim();

    rawX = rawX.replace(/\bblock\s+chain\b/gi, 'Blockchain').replace(/\bllms?\b/gi, 'Large Language Models (LLMs)');
    rawY = rawY.replace(/\bblock\s+chain\b/gi, 'Blockchain').replace(/\bllms?\b/gi, 'Large Language Models (LLMs)');

    if (rawX && rawY && rawX.toLowerCase() !== rawY.toLowerCase()) {
      subjectX = rawX.replace(/\b\w/g, c => c.toUpperCase());
      targetY = rawY.replace(/\b\w/g, c => c.toUpperCase());
      isRelationshipQuery = true;
      coreTech = subjectX; // Core technology is X (e.g. Python)
      intent = `Use and Integration of ${subjectX} in ${targetY} Development`;
      contentType = 'Technical Article';
      audience = 'Software Engineers & Application Architects';
    }
  }

  // 1. Identify Intent & Content Type (if not already relationship query)
  if (!isRelationshipQuery) {
    if (/\b(?:advantages?|benefits?|business impact|business value|why use)\b/i.test(lower)) {
      intent = 'Business Impact / Advantages';
      contentType = 'Technical Article';
      audience = 'Engineering / Business / Technology Professionals';
      coreTech = clean
        .replace(/^(?:advantages?|benefits?|business impact|business value|why use)\s+(?:of|for|in)?\s*/gi, '')
        .replace(/\s+(?:advantages?|benefits?|business impact|business value)\b/gi, '')
        .trim();
    } else if (/\b(?:defensive recommendations?|security recommendations?|mitigations?|defensive posture)\b/i.test(lower)) {
      intent = 'Security / Defensive Recommendations';
      contentType = 'Technical Article';
      audience = 'Engineering / Security Professionals';
      coreTech = clean
        .replace(/\s*(?:defensive recommendations?|security recommendations?|mitigations?|defensive posture)\s*/gi, '')
        .trim();
    } else if (/\bcase\s*study\b/i.test(lower)) {
      intent = 'Case Study Analysis';
      contentType = 'Case Study';
      audience = 'Engineering & Research Professionals';
      coreTech = clean
        .replace(/\s*(?:case\s*study|case\s*studies)\s*/gi, '')
        .replace(/^(?:case\s*study|case\s*studies)\s+(?:on|of|for)\s*/gi, '')
        .trim();
    } else if (/\bvulnerability\b/i.test(lower)) {
      intent = 'Vulnerability Breakdown';
      contentType = 'Vulnerability Alert';
      audience = 'Security & Systems Engineers';
      coreTech = clean.replace(/\s*vulnerability(?:\s*alert)?\s*/gi, '').trim();
    } else if (/\bmisconception/i.test(lower)) {
      intent = 'Common Misconceptions';
      contentType = 'Technical Article';
      audience = 'Developers & Systems Architects';
      coreTech = clean.replace(/\s*(?:common\s*)?misconception(?:s)?\s*/gi, '').trim();
    }
  }

  // Fallback coreTech if regex stripped everything
  if (!coreTech) coreTech = clean;

  // 2. Normalize Core Technology name
  coreTech = coreTech
    .replace(/\bblock\s+chain\b/gi, 'Blockchain')
    .replace(/\bllms?\b/gi, 'Large Language Models (LLMs)')
    .replace(/\bsuper\s+computer\b/gi, 'Supercomputer')
    .replace(/\bcloud\s+computing\b/gi, 'Cloud Computing')
    .replace(/\bquantum\s+computing\b/gi, 'Quantum Computing')
    .replace(/\bpython\s+history\b/gi, 'Python History')
    .replace(/\s+/g, ' ')
    .trim();

  if (coreTech === coreTech.toLowerCase() || coreTech === coreTech.toUpperCase()) {
    coreTech = coreTech.replace(/\b\w/g, c => c.toUpperCase());
  }

  return {
    coreTechnology: coreTech,
    contentIntent: intent,
    contentType,
    targetAudience: audience,
    subjectX,
    targetY,
    isRelationshipQuery,
  };
}

export function createStructuredContentPlan(
  rawTopic: string,
  postType: string = 'Educational',
  platform: string = 'LinkedIn / X',
  tone: string = 'Professional & Analytical',
  instructions: string = ''
): StructuredContentPlan {
  const classification = classifyUserRequest(rawTopic);

  let primarySubject = classification.coreTechnology;
  let secondarySubject = classification.targetY || '';
  let relationship = classification.isRelationshipQuery
    ? `Uses / Applications of ${classification.subjectX} in ${classification.targetY}`
    : classification.contentIntent;
  let intent = classification.contentIntent;

  if (classification.isRelationshipQuery && classification.subjectX && classification.targetY) {
    primarySubject = classification.subjectX;
    secondarySubject = classification.targetY;
    relationship = `Uses / Applications of ${primarySubject} in ${secondarySubject}`;
    intent = `Explain how ${primarySubject} is used in ${secondarySubject} development`;
  }

  return {
    primarySubject,
    secondarySubject,
    relationship,
    intent,
    postType: postType || classification.contentType || 'Educational',
    platform: platform || 'LinkedIn / X',
    tone: tone || 'Professional & Analytical',
    additionalInstructions: instructions || '',
  };
}

export function normalizeAndParseTopicInput(
  rawTopic: string,
  rawPostType?: string,
  rawFormat?: string
): ParsedTopicInput {
  const classification = classifyUserRequest(rawTopic);
  const postType = (rawPostType || classification.contentType || 'Technical Breakdown').trim();
  const format = (rawFormat || classification.contentIntent || 'Technical Explanation').trim();

  return {
    normalizedTopic: classification.coreTechnology,
    postType,
    format,
  };
}

export function createTopicProfile(requestedTopic: string, summary: string = ''): TopicProfile {
  const classification = classifyUserRequest(requestedTopic);
  const normalizedTopic = classification.coreTechnology;
  const category = classifyTopicCategory(normalizedTopic, summary);

  let primarySubject = normalizedTopic;
  let coreConcepts: string[] = [];
  let unrelatedTopics: string[] = [];

  if (category === 'Blockchain & Distributed Systems') {
    primarySubject = 'Distributed ledger technology, consensus mechanisms, smart contracts, and cryptographic verification';
    coreConcepts = ['Shared transaction records', 'Traceability & auditability', 'Smart contract automation', 'Tamper-evident records', 'Multi-party coordination', 'Reduced dependency on intermediaries'];
    unrelatedTopics = ['LLM prompt injection', 'Credential theft'];
  } else if (category === 'High-Performance Computing') {
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
    primarySubject = `${normalizedTopic} technical architecture and practical engineering applications`;
    coreConcepts = ['Technical mechanics', 'System architecture', 'Performance metrics', 'Practical applications'];
    unrelatedTopics = ['Unrelated security attacks'];
  }

  return {
    requestedTopic: normalizedTopic,
    topicCategory: category,
    primarySubject,
    importantConcepts: coreConcepts,
    unrelatedConcepts: unrelatedTopics,
    requestClassification: classification,
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
  'technical request',
  'technical overview and analysis',
  'technical overview and analysis of',
  'recent technical analysis published by',
  'recent technical analysis published by technical topic request',
  'technical disclosures published by technical request',
  'significant progress regarding',
  'analyzing advantage of',
  'analyzing advantages of',
  'analyzing benefit of',
  'analyzing benefits of',
  'analyzing llm defensive recommendations',
  'optimizing execution pathways and resource management',
  'streamlined workflow execution across complex technical workloads',
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
  'this highlights the importance of',
  '[topic]',
  '[source]',
  '[company]',
  '[disclosure]'
];

export function detectGenericFiller(content: string): string[] {
  const issues: string[] = [];
  const lower = (content || '').toLowerCase();

  for (const template of FORBIDDEN_GENERIC_TEMPLATES) {
    if (lower.includes(template)) {
      issues.push(`Generic template/placeholder phrase detected: "${template}". Content must be 100% topic-specific with zero filler.`);
    }
  }

  // Check for generic introductory filler patterns forbidden in Case Study / Technical posts
  if (/^recent technical analysis published by technical topic request/i.test(lower) ||
      /^recent disclosures regarding/i.test(lower) ||
      /^technical overview and analysis/i.test(lower)) {
    issues.push(`Forbidden generic introductory filler detected at post opening. The article must immediately explain the topic directly.`);
  }

  // Check if raw user search phrase is incorrectly used as technology name (e.g., "Analyzing advantage of block chain...")
  if (/analyzing\s+(?:advantage|advantages|benefits?|why use|defensive recommendations)/i.test(lower)) {
    issues.push(`User search phrase was incorrectly used as technology name (e.g. "Analyzing advantage of..."). Core technology name must be used cleanly.`);
  }

  // Check if raw relationship query phrase is incorrectly used as technology name (e.g. "Use of Python in Blockchain utilizes...")
  if (/(?:use|role|applications?)\s+of\s+.+?\s+in\s+.+?\s+(?:utilizes|demonstrates|operates|provides)/i.test(lower)) {
    issues.push(`Relationship query phrase was incorrectly used as technology name (e.g. "Use of X in Y utilizes..."). Explain X and Y separately.`);
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
