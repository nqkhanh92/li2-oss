import 'server-only'

import { getServiceClient } from '@/infrastructure/database/supabase/server'
import { queryCasdoor } from '@/infrastructure/database/casdoor/pool'
import { buildSeries, type DateRange, type DayCounts } from '@/core/helpers/admin-stats/date-series'

/**
 * Số liệu hoạt động theo ngày cho bảng điều khiển admin: đăng nhập, link tạo mới, artifact tạo mới.
 *
 * Ba nguồn, hai cơ sở dữ liệu: đăng nhập nằm ở Casdoor, hai cái còn lại ở Supabase.
 */

const toMap = (rows: Array<{ d: string; c: number }>) =>
  new Map(rows.map((r) => [r.d, Number(r.c)]))

/**
 * ⚠ Cả ba truy vấn dùng khoảng **nửa mở** `[from, toExclusive)`, không dùng `BETWEEN from AND to`.
 *
 * `BETWEEN '2026-10-01' AND '2026-10-27'` nghĩa là tới **nửa đêm** ngày 27, nên mất gần trọn ngày
 * cuối. Đo trên LiHi: `BETWEEN` cho 60 hàng, nửa mở cho **63** — ba hàng của ngày gần nhất biến
 * mất, mà đó chính là ngày người ta nhìn nhiều nhất trên biểu đồ.
 */

/** `touch_points` trừ ARTIFACT — mỗi artifact sinh một touch point, đếm cả thì link bị thổi phồng. */
const fetchShortLinksByDay = async (range: DateRange) => {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('touch_points')
    .select('created_at, content_type')
    .gte('created_at', range.from)
    .lt('created_at', range.toExclusive)
  if (error) throw error

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    // `upper()` vì dữ liệu thật có cả `URL` và `url` — so khớp phân biệt chữ sẽ bỏ sót.
    if ((row.content_type ?? '').toUpperCase() === 'ARTIFACT') continue
    const day = String(row.created_at).slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return counts
}

const fetchArtifactsByDay = async (range: DateRange) => {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('artifacts')
    .select('created_at')
    .gte('created_at', range.from)
    .lt('created_at', range.toExclusive)
  if (error) throw error

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const day = String(row.created_at).slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return counts
}

/**
 * Đăng nhập, từ bảng `record` của Casdoor.
 *
 * `created_time` là **VARCHAR** chứa RFC3339, nên so sánh thẳng bằng chuỗi: thứ tự từ điển của
 * RFC3339 trùng thứ tự thời gian. Cố ý KHÔNG bọc hàm quanh cột (`left()`, `cast()`) trong mệnh đề
 * `where` — bọc vào là mất sargable, index thành vô dụng và truy vấn quét cả bảng.
 */
const fetchLoginsByDay = async (range: DateRange) => {
  const rows = await queryCasdoor<{ d: string; c: string }>(
    `select left(created_time, 10) as d, count(*) as c
       from record
      where action = 'login'
        and created_time >= $1
        and created_time < $2
      group by 1`,
    [range.from, range.toExclusive]
  )
  return toMap(rows.map((r) => ({ d: r.d, c: Number(r.c) })))
}

export const getUserActivityByDay = async (range: DateRange): Promise<DayCounts[]> => {
  // Ba nguồn độc lập nhau; chạy tuần tự chỉ làm người dùng chờ lâu hơn mà không được gì.
  const [logins, shortLinks, artifacts] = await Promise.all([
    fetchLoginsByDay(range),
    fetchShortLinksByDay(range),
    fetchArtifactsByDay(range),
  ])

  return buildSeries(range, { logins, shortLinks, artifacts })
}
