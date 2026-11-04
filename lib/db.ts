import 'server-only'
import { Pool, type QueryResultRow } from 'pg'

/**
 * Kết nối Postgres. Pool được tạo LÚC DÙNG ĐẦU TIÊN, không lúc import.
 *
 * ⚠ Bản đầu của file này tạo pool ngay ở top level và `throw` nếu thiếu `DATABASE_URL`. Nó chạy
 * đúng khi có DB, nhưng làm `next build` **thất bại** — Next import mọi route handler ở bước
 * "collect page data", nên một `throw` lúc import nghĩa là không build được nếu không có
 * database đang chạy. Hệ quả: không ai build được image mà không dựng Postgres trước, và CI
 * cũng không.
 *
 * Lười khởi tạo sửa cả hai: build không cần DB, còn request thì vẫn báo lỗi rõ ràng nếu thiếu env.
 *
 * `globalThis` để `next dev` hot-reload không mở pool mới mỗi lần lưu file — không có nó thì
 * Postgres hết connection sau vài chục lần sửa.
 */
const globalForDb = globalThis as unknown as { li2Pool?: Pool }

function getPool(): Pool {
  if (globalForDb.li2Pool) return globalForDb.li2Pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL chưa được đặt. Sao chép .env.example thành .env rồi điền, hoặc chạy bằng docker compose.'
    )
  }

  const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 })
  // Pool của `pg` phát `error` cho connection nhàn rỗi bị server đóng. Không nghe sự kiện này
  // thì Node coi nó là uncaught và hạ cả tiến trình.
  pool.on('error', (err) => {
    console.error('[db] lỗi trên connection nhàn rỗi:', err.message)
  })

  globalForDb.li2Pool = pool
  return pool
}

export async function query<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params)
  return result.rows
}

export async function queryOne<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

/**
 * Cho đường cần transaction (`app/api/artifacts/route.ts` tạo link + artifact trong một
 * transaction). Người gọi tự `BEGIN`/`COMMIT`/`ROLLBACK` và tự `release()`.
 */
export function connect() {
  return getPool().connect()
}

/** Dùng trực tiếp khi cần API đầy đủ của `pg`. Gọi hàm, không phải biến — để giữ tính lười. */
export function dbPool(): Pool {
  return getPool()
}
