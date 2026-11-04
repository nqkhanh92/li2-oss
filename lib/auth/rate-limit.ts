import 'server-only'

/**
 * Hạn chế số lần thử đăng nhập. Bộ đếm trong RAM, cửa sổ trượt đơn giản.
 *
 * ⚠ Vì sao đây là việc BẮT BUỘC chứ không phải tinh chỉnh: `verifyPassword` dùng scrypt
 * N=2^15, tốn ~100ms CPU mỗi lần gọi. Và đường đăng nhập gọi nó **kể cả khi email không tồn
 * tại** (cố ý, để thời gian phản hồi không tiết lộ email nào có thật). Nghĩa là một người lạ
 * không cần tài khoản vẫn buộc được máy chủ tính scrypt — 10 request/giây là ~1 core bị chiếm.
 * Đó là DoS rẻ nhất có thể có, và nó là hệ quả trực tiếp của hai quyết định bảo mật đúng.
 *
 * ⚠ Giới hạn đã biết, nói rõ thay vì để người đọc tưởng là đủ:
 * - **Trong RAM** nên mất khi khởi động lại, và không chia sẻ giữa nhiều instance. Bản
 *   single-tenant chạy một tiến trình nên đủ; chạy nhiều bản sau một load balancer thì cần
 *   Redis (xem docs/ROADMAP.md).
 * - Khoá theo IP. Không có IP đáng tin khi `TRUSTED_PROXY=false` — lúc đó mọi người dùng chung
 *   một khoá `unknown`, tức một kẻ tấn công khoá được cả nhà. Đổi lại là máy chủ không bị hạ.
 *   Đây là đánh đổi có chủ ý: thà khoá tạm còn hơn hết CPU.
 */

type Bucket = { count: number; resetAt: number }

const WINDOW_MS = 15 * 60 * 1000 // 15 phút
const MAX_ATTEMPTS = 10

const globalForLimit = globalThis as unknown as { li2LoginBuckets?: Map<string, Bucket> }
const buckets: Map<string, Bucket> = globalForLimit.li2LoginBuckets ?? new Map()
globalForLimit.li2LoginBuckets = buckets

export type RateVerdict = { allowed: true; remaining: number } | { allowed: false; retryAfterSec: number }

export function checkLoginRate(key: string, now = Date.now()): RateVerdict {
  // Dọn cơ hội: mỗi lần gọi xoá vài bucket đã hết hạn, để Map không phình vô hạn khi bị quét.
  if (buckets.size > 1000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k)
      if (buckets.size <= 500) break
    }
  }

  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { allowed: true, remaining: MAX_ATTEMPTS - bucket.count }
}

/**
 * Đăng nhập thành công thì xoá bộ đếm — nếu không, một người dùng thật gõ sai 9 lần rồi đúng
 * lần thứ 10 vẫn bị khoá 15 phút sau đó.
 */
export function clearLoginRate(key: string): void {
  buckets.delete(key)
}

/** Chỉ dùng trong test. */
export function resetAllLoginRates(): void {
  buckets.clear()
}
