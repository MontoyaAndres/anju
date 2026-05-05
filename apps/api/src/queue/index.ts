import { handleIndexBatch } from './indexResource';
import { handleCrawlDiscoverBatch } from './crawlDiscover';
import { handleCrawlPageBatch } from './crawlPage';

export { handleIndexBatch, handleCrawlDiscoverBatch, handleCrawlPageBatch };

export type { IndexJob } from './indexResource';
export type { CrawlDiscoverJob } from './crawlDiscover';
export type { PageJob } from './crawlPage';
