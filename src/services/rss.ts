import Parser from 'rss-parser';
import { DiscoveredTopic } from '../models/types';
import { Logger } from '../utils/logger';

export class RSSService {
  private parser: Parser;
  private defaultFeeds = [
    { name: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml' },
    { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { name: 'Reddit Machine Learning', url: 'https://www.reddit.com/r/MachineLearning/hot.rss' },
    { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  ];

  constructor() {
    this.parser = new Parser({
      headers: { 'User-Agent': 'Autonomous-AI-Agent/1.0' },
      timeout: 10000,
    });
  }

  async fetchTopics(): Promise<DiscoveredTopic[]> {
    const topics: DiscoveredTopic[] = [];

    for (const feedConfig of this.defaultFeeds) {
      try {
        const feed = await this.parser.parseURL(feedConfig.url);
        const items = (feed.items || []).slice(0, 5);

        for (const item of items) {
          if (item.title && item.link) {
            let pubDateIso = new Date().toISOString();
            if (item.isoDate || item.pubDate) {
              try { pubDateIso = new Date(item.isoDate || item.pubDate!).toISOString(); } catch {}
            }

            topics.push({
              title: item.title.trim(),
              url: item.link,
              source: feedConfig.name,
              summary: (item.contentSnippet || item.content || item.title).slice(0, 300).trim(),
              publishedAt: pubDateIso,
            });
          }
        }
      } catch (error) {
        Logger.warn(`RSS feed fetch failed for ${feedConfig.name}: ${(error as Error).message}`);
      }
    }

    return topics;
  }
}
