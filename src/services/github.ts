import axios from 'axios';
import { DiscoveredTopic } from '../models/types';
import { Logger } from '../utils/logger';

export class GitHubService {
  async fetchTopics(): Promise<DiscoveredTopic[]> {
    const topics: DiscoveredTopic[] = [];

    try {
      // Query recent AI/ML trending repos
      const res = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: 'topic:ai topic:machine-learning created:>2025-01-01',
          sort: 'stars',
          order: 'desc',
          per_page: 5,                 
        },
        headers: {
          'User-Agent': 'Autonomous-AI-Agent/1.0',
          'Accept': 'application/vnd.github.v3+json',
        },
        
        timeout: 8000,
      });

      const items = res.data?.items || [];
      for (const item of items) {
        topics.push({
          title: `GitHub Repository: ${item.full_name}`,
          url: item.html_url,
          source: 'GitHub Trending',
          summary: item.description || `Popular AI repository written in ${item.language || 'TypeScript'} with ${item.stargazers_count} stars.`,
          publishedAt: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
        });
      }
    } catch (error) {
      Logger.warn(`GitHub Trending fetch failed: ${(error as Error).message}`);
    }

    return topics;
  }
}
