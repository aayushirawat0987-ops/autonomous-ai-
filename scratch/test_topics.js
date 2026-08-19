const { classifyTopicCategory } = require('../dist/services/openai');
const { createTopicProfile, validateStructureAndSanitize } = require('../dist/utils/sanitizer');

const testTopics = [
  'Supercomputer',
  'Quantum Computing',
  'Generative AI',
  'Robotics',
  'Cloud Computing',
  'Cybersecurity',
  'Python',
  'Databases',
  'Edge Computing',
  'Computer Vision',
  'AI Agents',
  'LLM Security',
  'Semiconductor Technology',
  'IoT',
  'Web Development'
];

console.log('====================================================');
console.log('15-TOPIC CLASSIFICATION & PROFILING AUDIT');
console.log('====================================================');

testTopics.forEach((topic, idx) => {
  const profile = createTopicProfile(topic);
  console.log(`[${idx + 1}] Topic: "${topic}"`);
  console.log(`    Category: ${profile.topicCategory}`);
  console.log(`    Primary Subject: ${profile.primarySubject}`);
  console.log(`    Core Concepts: ${profile.importantConcepts.slice(0, 3).join(', ')}`);
  console.log('----------------------------------------------------');
});

console.log('\n====================================================');
console.log('STRUCTURAL SANITIZER & INTERNAL TEXT LEAKAGE TEST');
console.log('====================================================');

const badDraft = `
User Manual Request
Title: Supercomputer Analysis

WHAT HAPPENED
Supercomputers utilize massive parallel arrays.

WHAT HAPPENED
Supercomputers utilize massive parallel arrays.

TECHNICAL EXPLANATION
According to the prompt, supercomputers calculate FLOPS across nodes.
`;

const result = validateStructureAndSanitize(badDraft, "User Manual Request");

console.log("Sanitizer Output Passed?", result.valid);
console.log("Issues Flagged:", result.issues);
console.log("\nSanitized Title:", result.sanitizedTitle);
console.log("Sanitized Content:\n", result.sanitizedContent);
console.log('====================================================');
