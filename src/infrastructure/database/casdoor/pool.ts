import 'server-only'
import { Pool } from 'pg'

import { logger } from '@/infrastructure/logging/logger'

/**
 * Pool Postgres **riêng** trỏ DB của Casdoor, chỉ để đọc.
 *
 * Vì sao không dùng Supabase client: Casdoor có DB riêng, không nằm sau PostgREST, nên không có
 * đường HTTP nào tới `record` hay `user`. Đây là chỗ duy nhất trong repo mở kết nối pg thô.
 *
 * ⚠ **Tuỳ chọn, và thiếu thì chịu được.** Không có `CASDOOR_DB_URL` thì chỉ endpoint nào cần nó
 * trả 503 — app vẫn phục vụ mọi thứ khác. Ném lỗi lúc nạp module sẽ làm sập cả tiến trình vì một
 * tính năng admin mà hầu hết người dùng không chạm tới.
 *
 * Tên DB khác nhau giữa hai môi trường: LiHi là `casdoor`, prod `.83` là `casdoor_db`. Nên đọc từ
 * env chứ đừng ghép chuỗi trong code.
 */

const log = logger.child({ module: 'casdoor-pool' })

let pool: Pool | null = null

export const CASDOOR_DB_URL_ENV = 'CASDOOR_DB_URL'

export const isCasdoorDbConfigured = () => Boolean(process.env[CASDOOR_DB_URL_ENV]?.trim())

/**
 * `null` khi chưa cấu hình — nơi gọi tự quyết trả 503. Không ném, để lỗi cấu hình không trông
 * giống lỗi truy vấn trong log.
 */
export const getCasdoorPool = (): Pool | null => {
  const url = process.env[CASDOOR_DB_URL_ENV]?.trim()
  if (!url) return null

  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      // Truy vấn thống kê quét theo ngày; treo vô hạn ở đây sẽ giữ kết nối và kéo cả pool xuống.
      statement_timeout: 10_000,
    })

    /**
     * `pg` ném sự kiện `error` trên client NHÀN RỖI khi phía kia đóng kết nối (restart DB, idle
     * timeout của proxy). Không bắt thì Node coi là uncaught và **giết tiến trình** — cả app chết
     * vì một cái pool phụ. Ghi log rồi để `pg` tự dựng kết nối mới ở lần truy vấn sau.
     */
    pool.on('error', (error) => {
      log.error({ error }, 'Casdoor pool idle client error')
    })
  }

  return pool
}

/**
 * Đọc read-only. `pg` tham số hoá sẵn nên không nối chuỗi vào SQL.
 */
export const queryCasdoor = async <T extends Record<string, unknown>>(
  text: string,
  params: unknown[]
): Promise<T[]> => {
  const p = getCasdoorPool()
  if (!p) return []
  const result = await p.query(text, params)
  return result.rows as T[]
}
