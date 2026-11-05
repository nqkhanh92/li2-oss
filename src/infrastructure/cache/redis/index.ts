import 'server-only'
import Redis, { RedisOptions } from 'ioredis'

// ⚠ `Number(undefined)` là `NaN`, không phải 0. Biến chưa khai thì `db: NaN` làm ioredis gửi
// `SELECT NaN` và Redis trả `ERR value is not an integer or out of range` ở MỌI lệnh; còn
// `port: NaN` ném `ERR_SOCKET_BAD_PORT`. Cả hai chỉ hiện ra khi chạy, dưới dạng lỗi Redis
// không nhắc gì tới cấu hình thiếu. Mặc định đúng chuẩn Redis: cổng 6379, db 0.
const options: RedisOptions = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB) || 0,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
}

export const redis = globalThis._redis ?? new Redis(options)
if (process.env.NODE_ENV !== 'production') globalThis._redis = redis
