const { classifyTopicCategory, countMainContentWords } = require('../dist/services/openai');
const { createTopicProfile, validateStructureAndSanitize, detectGenericFiller, normalizeAndParseTopicInput } = require('../dist/utils/sanitizer');

console.log('====================================================');
console.log('SECTIONS 55-64: CRITICAL INPUT PARSING AUDIT');
console.log('====================================================');

const dirtyInputs = [
  "block chain: Security Analysis: Technical Explanation",
  "SUPER COMPUTER: Technical Breakdown",
  "python history: Common Misconception",
  "BLOCK CHAIN",
  "blockchain technology",
  "quantum computing"
];

dirtyInputs.forEach((raw, idx) => {
  const parsed = normalizeAndParseTopicInput(raw);
  console.log(`[${idx + 1}] Raw UI Input: "${raw}"`);
  console.log(`    Normalized Topic: "${parsed.normalizedTopic}"`);
  console.log(`    Parsed Post Type: "${parsed.postType}"`);
  console.log(`    Parsed Format:    "${parsed.format}"`);
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
