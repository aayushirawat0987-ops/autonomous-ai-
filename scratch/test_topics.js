const { classifyTopicCategory, countMainContentWords } = require('../dist/services/openai');
const { createTopicProfile, validateStructureAndSanitize, detectGenericFiller } = require('../dist/utils/sanitizer');

const masterTopics = [
  'SUPERCOMPUTER',
  'BLOCKCHAIN TECHNOLOGY',
  'QUANTUM COMPUTING',
  'ROBOTICS',
  'CLOUD COMPUTING',
  'GENERATIVE AI',
  'CYBERSECURITY',
  'PYTHON',
  'DATABASE MANAGEMENT',
  'COMPUTER VISION',
  'AI AGENTS',
  'LLM SECURITY',
  'IoT',
  'EDGE COMPUTING',
  'SEMICONDUCTORS',
  'WEB DEVELOPMENT',
  'OPERATING SYSTEMS',
  'MACHINE LEARNING',
  'NATURAL LANGUAGE PROCESSING',
  '5G TECHNOLOGY'
];

console.log('====================================================');
console.log('MASTER 20-TOPIC CLASSIFICATION & PROFILING AUDIT');
console.log('====================================================');

masterTopics.forEach((topic, idx) => {
  const profile = createTopicProfile(topic);
  console.log(`[${idx + 1}] Topic: "${topic}"`);
  console.log(`    Category: ${profile.topicCategory}`);
  console.log(`    Primary Subject: ${profile.primarySubject}`);
  console.log(`    Core Concepts: ${profile.importantConcepts.slice(0, 3).join(', ')}`);
  console.log('----------------------------------------------------');
});

console.log('\n====================================================');
console.log('STRUCTURAL SANITIZER & AI CLICHÉ DETECTOR TEST');
console.log('====================================================');

const ClicheDraft = `
In today's rapidly evolving world, artificial intelligence is transforming everything.
This marks a significant milestone in technology.
This is a game changer for modern developers.
`;

const clicheIssues = detectGenericFiller(ClicheDraft);
console.log("Cliche Detection Flagged Issues:", clicheIssues);

const badDraft = `
User Manual Request
Title: Blockchain Technology Analysis

WHAT HAPPENED
Blockchain provides decentralized consensus.

WHAT HAPPENED
Blockchain provides decentralized consensus.

TECHNICAL EXPLANATION
According to the prompt, transactions are validated by nodes.
`;

const result = validateStructureAndSanitize(badDraft, "User Manual Request");

console.log("\nSanitizer Output Passed?", result.valid);
console.log("Issues Flagged:", result.issues);
console.log("\nSanitized Title:", result.sanitizedTitle);
console.log("Sanitized Content:\n", result.sanitizedContent);
console.log('====================================================');
