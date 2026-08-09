import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  cronSchedule: process.env.CRON_SCHEDULE || '*/30 * * * *',
  logLevel: process.env.LOG_LEVEL || 'info',
  backendUrl: process.env.BACKEND_URL || 'https://autonomous-ai-m8ki.onrender.com',
};

export { OpenAIService } from '../services/openai';

