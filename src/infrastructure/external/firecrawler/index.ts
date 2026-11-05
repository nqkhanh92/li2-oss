import { Firecrawler } from './firecrawler'

export const firecrawlerService =
  process.env.NODE_ENV !== 'production'
    ? new Firecrawler()
    : globalThis._firecrawlerService ?? (globalThis._firecrawlerService = new Firecrawler())
