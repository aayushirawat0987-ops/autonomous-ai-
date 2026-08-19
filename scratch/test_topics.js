const { OpenAIService, classifyTopicCategory, countMainContentWords } = require('../dist/services/openai');

const topics = [
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

console.log('=== TOPIC CLASSIFICATION & GROUNDING TEST ===');

topics.forEach((t, i) => {
  const category = classifyTopicCategory(t);
  console.log(`${i + 1}. Topic: "${t}" -> Category: "${category}"`);
});

console.log('=== TEST COMPLETE ===');
