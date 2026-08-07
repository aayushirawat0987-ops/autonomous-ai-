import { DiscoveredTopic } from '../models/types';
import { ArxivService } from '../services/arxiv';
import { GitHubService } from '../services/github';
import { HackerNewsService } from '../services/hackernews';
import { RSSService } from '../services/rss';
import { Logger } from '../utils/logger';

export class TopicDiscoveryEngine {
  private rssService: RSSService;
  private hnService: HackerNewsService;
  private ghService: GitHubService;
  private arxivService: ArxivService;

  constructor() {
    this.rssService = new RSSService();
    this.hnService = new HackerNewsService();
    this.ghService = new GitHubService();
    this.arxivService = new ArxivService();
  }

  async discoverAllTopics(agentId?: string): Promise<DiscoveredTopic[]> {
    Logger.info('Starting Topic Discovery across live sources...', agentId);

    const [rssTopics, hnTopics, ghTopics, arxivTopics] = await Promise.all([
      this.rssService.fetchTopics().catch(() => []),
      this.hnService.fetchTopics().catch(() => []),
      this.ghService.fetchTopics().catch(() => []),
      this.arxivService.fetchTopics().catch(() => []),
    ]);

    const allTopics = [...rssTopics, ...hnTopics, ...ghTopics, ...arxivTopics];

    // Deduplicate by URL and Title
    const uniqueTopics: DiscoveredTopic[] = [];
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();

    for (const t of allTopics) {
      const normUrl = t.url.toLowerCase();
      const normTitle = t.title.toLowerCase();

      if (!seenUrls.has(normUrl) && !seenTitles.has(normTitle)) {
        seenUrls.add(normUrl);
        seenTitles.add(normTitle);
        uniqueTopics.push(t);
      }
    }

    Logger.info(`Topic Discovery complete. Found ${uniqueTopics.length} unique raw topics.`, agentId);
    return uniqueTopics;
  }
}
