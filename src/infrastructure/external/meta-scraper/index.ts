import axios, { AxiosError } from 'axios'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ service: 'meta-scraper' })

export class MetaScraper {
  protected static axiosInstance = axios.create({
    baseURL: `${process.env.META_SCRAPER_API_URL}`,
    headers: {
      'Content-Type': 'application/json',
      /**
       * `anything` là **mặc định cũ viết cứng**, giữ lại làm giá trị lùi về chứ không phải vì nó
       * đúng: trình quét hiện tại không kiểm token, nên đổi thẳng sang env mà môi trường chưa khai
       * biến sẽ gửi `Bearer undefined` — tức tự tay đổi một đường đang chạy thành một đường 401.
       *
       * Đặt `META_SCRAPER_API_KEY` khi trình quét bắt đầu đòi khoá thật. Khi đó xoá nhánh mặc định
       * này đi, vì để lại là một khoá công khai nằm trong mã nguồn.
       */
      Authorization: `Bearer ${process.env.META_SCRAPER_API_KEY || 'anything'}`,
    },
    timeout: 4000,
  })

  public static async scrape(url: string) {
    log.info({ method: 'scrape', url }, 'Starting URL scraping')

    try {
      /**
       * `params` chứ KHÔNG nối chuỗi. Bản cũ là `` `/scrape?url=${url}` `` — một URL chứa `&`
       * hoặc `#` sẽ cắt đứt truy vấn và **nhét thêm tham số** vào API của trình quét, mà URL thì
       * do người dùng nhập. Axios tự mã hoá khi đi qua `params`.
       */
      const response = await MetaScraper.axiosInstance.get('/scrape', { params: { url } })

      log.info(
        {
          method: 'scrape',
          url,
          statusCode: response.status,
          hasData: !!response.data,
          title: response?.data?.title,
        },
        'URL scraped successfully'
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError
        log.error(
          {
            method: 'scrape',
            url,
            statusCode: axiosError.response?.status,
            errorMessage: axiosError.message,
            errorCode: axiosError.code,
            responseData: axiosError.response?.data,
          },
          'Failed to scrape URL'
        )
      } else {
        log.error(
          {
            method: 'scrape',
            url,
            error,
          },
          'Unexpected error while scraping URL'
        )
      }
    }
  }
}
