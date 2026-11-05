'use server'
import { MetaScraper } from '@/infrastructure/external/meta-scraper'

export const fetchMetaTags = async (url: string) => {
  const data = await MetaScraper.scrape(url)

  if (data && data.image === null) delete data.image

  return data
}
