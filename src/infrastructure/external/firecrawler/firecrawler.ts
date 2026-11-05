import { logger } from '@/infrastructure/logging/logger'
import axios from 'axios'

const log = logger.child({
  service: 'firecrawler',
})

type MetaData = {
  twitter_site?: string
  robots?: string
  msapplication_TileImage?: string
  description?: string
  og_image_alt?: string
  twitter_creator?: string
  language?: string
  ogSiteName?: string
  og_type?: string
  msapplication_config?: string
  og_image_height?: string
  msapplication_TileColor?: string
  ogTitle?: string
  twitter_card?: string
  og_description?: string
  ogImage?: string
  msapplication_square310x310logo?: string
  viewport?: string
  ogUrl?: string
  application_name?: string
  og_url?: string
  title?: string
  favicon?: string
  og_image?: string
  og_image_width?: string
  msapplication_square150x150logo?: string
  theme_color?: string
  og_site_name?: string
  msapplication_wide310x150logo?: string
  og_title?: string
  ogDescription?: string
  msapplication_square70x70logo?: string
  scrapeId?: string
  sourceURL?: string
  url?: string
  statusCode?: number
  contentType?: string
  proxyUsed?: string
  creditsUsed?: number
}
export type ScrapeResponse = {
  success: boolean
  data: {
    markdown: string
    metadata: MetaData
  }
}

export class Firecrawler {
  protected axiosInstance = axios.create({
    baseURL: `${process.env.FIRECRAWLER_API_URL}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer anything`,
    },
    timeout: 10000,
  })

  async getPageMarkdown(url: string) {
    try {
      const { data } = await this.axiosInstance.post<ScrapeResponse>(`/scrape`, {
        url,
        formats: ['markdown'],
      })
      return data
    } catch (error: any) {
      log.info({
        message: 'Failed to get page markdown for url ' + url,
        error: error?.response?.data ?? error,
      })
      return null
    }
  }

  async getMetaTags(url: string) {
    try {
      const { data } = await this.axiosInstance.post<ScrapeResponse>(`/scrape`, {
        url,
        formats: [],
      })
      const title = data.data.metadata.ogTitle || data.data.metadata.title
      const description = data.data.metadata.ogDescription || data.data.metadata.description
      const image = data.data.metadata.ogImage || data.data.metadata.og_image
      const result = { title, description, image }
      return result
    } catch (error: any) {
      log.info({
        message: 'Failed to get metatags for url ' + url,
        error: error?.response?.data ?? error,
      })
      return null
    }
  }
}
