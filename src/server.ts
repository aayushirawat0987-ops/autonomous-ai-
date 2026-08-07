import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { handleAgentInit } from './api/init';
import { handleAgentFeed } from './api/feed';
import { handleAgentList, handleAgentStatus, handleAgentTrigger, handleAgentLogs } from './api/agent';
import { schedulerEngine } from './agent/scheduler';
import { Logger } from './utils/logger';

const app = express();

// Middlewares
app.use(cors());
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

// Fallback route serving UI single-page dashboard
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// Start Server
app.listen(config.port, async () => {
  Logger.info(`🚀 Autonomous AI Creator server running on http://localhost:${config.port}`);
  Logger.info(`Environment: PORT=${config.port}, CRON="${config.cronSchedule}"`);
  
  // Resume background schedulers for all agents saved in database
  await schedulerEngine.resumeAllActiveSchedulers();
});
