import Parser from 'rss-parser';
import { DiscoveredTopic } from '../models/types';
import { Logger } from '../utils/logger';

export class ArxivService {
  private parser: Parser;
  private arxivFeedUrl = 'http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.CR&max_results=5&sortBy=submittedDate&sortOrder=descending';

  constructor() {
    this.parser = new Parser({
      headers: { 'User-Agent': 'Autonomous-AI-Agent/1.0' },
      timeout: 10000,
    });
  }

  async fetchTopics(): Promise<DiscoveredTopic[]> {
    const topics: DiscoveredTopic[] = [];

    try {
      const feed = await this.parser.parseURL(this.arxivFeedUrl);
      const items = feed.items || [];

      for (const item of items) {
        if (item.title && item.link) {
          const titleClean = item.title.replace(/\n/g, ' ').trim();
          topics.push({
            title: `arXiv Paper: ${titleClean}`,
            url: item.link,
            source: 'arXiv AI',
            summary: (item.summary || item.contentSnippet || titleClean).replace(/\n/g, ' ').slice(0, 300).trim(),
            publishedAt: item.isoDate || item.pubDate ? new Date(item.isoDate || item.pubDate!).toISOString() : new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      Logger.warn(`arXiv fetch failed: ${(error as Error).message}`);
    }

    return topics;
  }
}
