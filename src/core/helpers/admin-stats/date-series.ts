/**
 * Dải ngày cho biểu đồ admin.
 *
 * Biểu đồ đường mà thiếu ngày 0 thì nó **nối thẳng qua chỗ trống**, và người đọc thấy một đường
 * đi ngang thay vì một cái hố. Nên mọi ngày trong khoảng đều phải có mặt, kể cả ngày không có gì.
 */

export type DayCounts = {
  date: string
  logins: number
  short_links_created: number
  artifacts_created: number
}

/** Số ngày mặc định khi lời gọi không nêu khoảng. */
export const DEFAULT_RANGE_DAYS = 30

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * `YYYY-MM-DD` → mốc UTC nửa đêm.
 *
 * Ghim UTC chứ không dùng `new Date('2026-10-27')` suông ở chỗ khác: chuỗi chỉ-ngày được JS hiểu
 * là UTC, nhưng `new Date(2026, 9, 27)` lại là giờ máy — trộn hai lối đó làm biểu đồ lệch đúng một
 * ngày ở nửa vòng trái đất. Cả hai DB cũng đang ở UTC (`show timezone` trên LiHi trả `UTC`).
 */
export const parseDateOnly = (value: string): Date | null => {
  if (!DATE_ONLY.test(value)) return null
  const time = Date.parse(`${value}T00:00:00Z`)
  if (Number.isNaN(time)) return null
  const date = new Date(time)
  // Chặn ngày không tồn tại: `2026-02-31` qua được regex nhưng `Date` lặng lẽ cuộn sang 03-03.
  return toDateOnly(date) === value ? date : null
}

export const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10)

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 86_400_000)

/**
 * Khoảng ngày đã chuẩn hoá, **inclusive hai đầu**.
 *
 * `to` trả thêm dạng nửa mở (`toExclusive` = to + 1 ngày) vì đó mới là thứ đem xuống SQL. Dùng
 * `BETWEEN from AND to` với `to` là ngày trần sẽ cắt mất **cả ngày cuối** — đo trên LiHi:
 * `BETWEEN '2026-10-01' AND '2026-10-27'` cho 60 hàng, nửa mở cho **63**. Ba hàng của ngày gần
 * nhất biến mất, mà ngày gần nhất là ngày người ta nhìn nhiều nhất.
 */
export type DateRange = { from: string; to: string; toExclusive: string }

/**
 * Thiếu hoặc sai định dạng thì lùi về `DEFAULT_RANGE_DAYS` ngày gần nhất, KHÔNG ném lỗi — biểu đồ
 * admin không nên trắng chỉ vì một tham số gõ nhầm.
 *
 * Nhưng `from > to` thì **đảo lại** chứ không lặng lẽ trả rỗng: một khoảng ngược gần như luôn là
 * gõ nhầm thứ tự, và trả rỗng làm người đọc tưởng không có dữ liệu.
 */
export const resolveDateRange = (
  rawFrom: string | null | undefined,
  rawTo: string | null | undefined,
  today: Date = new Date()
): DateRange => {
  const parsedFrom = rawFrom ? parseDateOnly(rawFrom) : null
  const parsedTo = rawTo ? parseDateOnly(rawTo) : null

  const to = parsedTo ?? new Date(Date.parse(`${toDateOnly(today)}T00:00:00Z`))
  const from = parsedFrom ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1))

  const [lo, hi] = from.getTime() <= to.getTime() ? [from, to] : [to, from]

  return {
    from: toDateOnly(lo),
    to: toDateOnly(hi),
    toExclusive: toDateOnly(addDays(hi, 1)),
  }
}

/** Mọi ngày trong khoảng, tăng dần, inclusive hai đầu. */
export const eachDay = (range: DateRange): string[] => {
  const out: string[] = []
  const end = Date.parse(`${range.to}T00:00:00Z`)
  for (let t = Date.parse(`${range.from}T00:00:00Z`); t <= end; t += 86_400_000) {
    out.push(toDateOnly(new Date(t)))
  }
  return out
}

/**
 * Ghép ba nguồn đếm rời rạc thành một dải liên tục.
 *
 * Ngày có trong `counts` mà **ngoài** khoảng thì bị bỏ, không nhồi vào hai đầu: một bản ghi lạc
 * ngày làm cột đầu dải phình lên và trông như một đỉnh có thật.
 */
export const buildSeries = (
  range: DateRange,
  counts: {
    logins: Map<string, number>
    shortLinks: Map<string, number>
    artifacts: Map<string, number>
  }
): DayCounts[] =>
  eachDay(range).map((date) => ({
    date,
    logins: counts.logins.get(date) ?? 0,
    short_links_created: counts.shortLinks.get(date) ?? 0,
    artifacts_created: counts.artifacts.get(date) ?? 0,
  }))
