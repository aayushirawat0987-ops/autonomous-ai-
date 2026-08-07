import axios from 'axios';
import { DiscoveredTopic } from '../models/types';
import { Logger } from '../utils/logger';

export class HackerNewsService {
  private baseUrl = 'https://hacker-news.firebaseio.com/v0';

  async fetchTopics(): Promise<DiscoveredTopic[]> {
    const topics: DiscoveredTopic[] = [];

    try {
      const topIdsRes = await axios.get<number[]>(`${this.baseUrl}/topstories.json?print=pretty`, { timeout: 8000 });
      const topIds = (topIdsRes.data || []).slice(0, 20);

      const itemPromises = topIds.map(id =>
        axios.get(`${this.baseUrl}/item/${id}.json`, { timeout: 5000 }).catch(() => null)
      );

      const itemResponses = await Promise.all(itemPromises);

      for (const res of itemResponses) {
        if (!res || !res.data) continue;
        const item = res.data;
        const title: string = item.title || '';
        const titleLower = title.toLowerCase();

        // Filter for AI / Security / Systems tech topics
        const isTechOrAI = ['ai', 'llm', 'security', 'model', 'agent', 'gpu', 'rust', 'code', 'paper', 'python', 'cyber'].some(keyword => titleLower.includes(keyword));

        if (title && item.url && isTechOrAI) {
          topics.push({
            title: title.trim(),
            url: item.url,
            source: 'Hacker News',
            summary: `Hacker News top discussion submission with ${item.score || 0} points and ${item.descendants || 0} comments.`,
            publishedAt: item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      Logger.warn(`Hacker News fetch failed: ${(error as Error).message}`);
    }

    return topics;
  }
}
