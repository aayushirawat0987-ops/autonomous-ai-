import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { handleAgentInit } from './api/init';
import { handleAgentFeed } from './api/feed';
import { 
  handleAgentList, 
  handleAgentStatus, 
  handleAgentTrigger, 
  handleAgentLogs,
  handleAgentPostGenerate,
  handlePostUpdate,
  handlePostDelete,
  handlePostRegenerate,
  handlePostPublish,
  handleAgentMission,
  handleAgentTrends,
  handleAgentOpportunities
} from './api/agent';
import { schedulerEngine } from './agent/scheduler';
import { Logger } from './utils/logger';

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.options('*', cors());
app.use(express.json());

// Serve static frontend dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Required Primary APIs
app.post('/api/agent/init', handleAgentInit);
app.get('/api/agent/feed', handleAgentFeed);

// Dashboard & Control Helper APIs
app.get('/api/agent/list', handleAgentList);
app.get('/api/agent/status', handleAgentStatus);
app.post('/api/agent/trigger', handleAgentTrigger);
app.get('/api/agent/logs', handleAgentLogs);
app.get('/api/agent/mission/latest', handleAgentMission);
app.get('/api/agent/trends', handleAgentTrends);
app.get('/api/agent/opportunities', handleAgentOpportunities);

// Post Management & Manual Generation APIs
app.post('/api/agent/post/generate', handleAgentPostGenerate);
app.put('/api/agent/post/:id', handlePostUpdate);
app.delete('/api/agent/post/:id', handlePostDelete);
app.post('/api/agent/post/:id/regenerate', handlePostRegenerate);
app.post('/api/agent/post/:id/publish', handlePostPublish);

// Fallback route serving UI single-page dashboard
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

export default app;

// Start Server (only when run directly outside Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(config.port, async () => {
    Logger.info(`🚀 Autonomous AI Creator server running on http://localhost:${config.port}`);
    Logger.info(`Environment: PORT=${config.port}, CRON="${config.cronSchedule}"`);
    
    // Auto-sync database schema if SQLite DB file is new
    try {
      const { execSync } = await import('child_process');
      execSync('npx prisma db push --accept-data-loss', { stdio: 'ignore' });
      Logger.info('Prisma database schema verified successfully.');
    } catch (dbErr) {
      Logger.error('Database schema auto-push skipped or failed', dbErr);
    }

    // Resume background schedulers for all agents saved in database
    await schedulerEngine.resumeAllActiveSchedulers();
  });
}
