import { prisma } from '../database/prisma';

export class Logger {
  private static formatTime(): string {
    return new Date().toISOString();
  }

  static info(message: string, agentId?: string, details?: any): void {
    console.log(`[${this.formatTime()}] [INFO] ${message}`);
    if (agentId) {
      this.persistLog(agentId, 'INFO', message, details);
    }
  }

  static warn(message: string, agentId?: string, details?: any): void {
    console.warn(`[${this.formatTime()}] [WARN] ${message}`);
    if (agentId) {
      this.persistLog(agentId, 'WARN', message, details);
    }
  }

  static error(message: string, error?: any, agentId?: string): void {
    const errorDetails = error ? (error.stack || error.message || String(error)) : '';
    console.error(`[${this.formatTime()}] [ERROR] ${message} ${errorDetails}`);
    if (agentId) {
      this.persistLog(agentId, 'ERROR', message, { error: errorDetails });
    }
  }

  static editorial(message: string, agentId: string, details?: any): void {
    console.log(`[${this.formatTime()}] [EDITORIAL] ${message}`);
    this.persistLog(agentId, 'EDITORIAL', message, details);
  }

  private static async persistLog(agentId: string, level: string, message: string, details?: any) {
    try {
      await prisma.agentLog.create({
        data: {
          agentId,
          level,
          message,
          details: details ? JSON.stringify(details) : null,
        },
      });
    } catch (err) {
      // Prevent logging failures from crashing execution
    }
  }
}
