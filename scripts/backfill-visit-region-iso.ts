/**
 * Điền `visits.region_iso` + `visits.region_boundary_version` từ dữ liệu GeoIP đã có.
 *
 *   npx tsx scripts/backfill-visit-region-iso.ts --dry-run    # chỉ đếm, không ghi
 *   npx tsx scripts/backfill-visit-region-iso.ts              # ghi thật
 *
 * Đọc `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` từ `.env.local`. Chạy sau migration
 * `20261026000001_analytics__visit_region_iso.sql`.
 *
 * VÌ SAO BACKFILL Ở ĐÂY MÀ KHÔNG PHẢI TRONG SQL
 *
 * Việc suy ra tỉnh cần bảng `aliases` của 34 tỉnh và bảng `LEGACY_ISO_CODES` của 63 mã cũ — cả
 * hai nằm trong `src/shared/constants/vietnam-provinces.ts`. Chép chúng xuống SQL sẽ thành bản
 * thứ hai của cùng một sự thật, và bản nào lệch thì bản đồ sai im lặng. Nên script này gọi
 * thẳng `resolveVisitProvince`, một nguồn duy nhất.
 *
 * CHẠY LẠI ĐƯỢC. Chỉ chạm hàng `region_iso is null`, nên chạy mười lần cũng như một lần. Hàng
 * không nhận ra tỉnh thì **để nguyên NULL** — cố ý: NULL nghĩa là "chưa nhận ra", và nó phải
 * đếm được để biết độ phủ, chứ không gộp vào một tỉnh nào.
 *
 * MỖI CẶP MỘT CÂU UPDATE. Số tổ hợp `(region, city, country)` khác nhau rất nhỏ (đo trên LiHi:
 * 4 tổ hợp cho toàn bộ bảng), nên nhóm theo tổ hợp rẻ hơn hẳn việc đọc từng hàng rồi ghi lại.
 */
import * as dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

import {
  VN_BOUNDARY_VERSION,
  resolveVisitProvince,
} from '../src/shared/constants/vietnam-provinces'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const dryRun = process.argv.includes('--dry-run')

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) {
  console.error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY. Giải .env.local trước khi chạy.')
  process.exit(1)
}
const supabase = createClient(url, serviceKey)

const PAGE_SIZE = 1000

type Combo = { region: string | null; city: string | null; country: string | null; rows: number }

/**
 * Mã ISO đầy đủ của nước khác thì giữ nguyên, không remap.
 *
 * Bảng 63→34 chỉ biết Việt Nam. Một mã như `ID-JK` đã đúng chuẩn rồi, bỏ đi là mất dữ liệu
 * thật; nhưng cũng không được gắn `boundary_version` của Việt Nam vào nó — ta không biết mã đó
 * thuộc bộ ranh giới nào, và đoán thì tệ hơn để trống.
 */
const foreignIsoCode = (region: string | null): string | null => {
  const code = region?.trim().toUpperCase()
  if (!code) return null
  return /^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(code) ? code : null
}

async function distinctCombos(): Promise<Combo[]> {
  const byKey = new Map<string, Combo>()

  // Phân trang thủ công: PostgREST trả tối đa 1000 hàng một lần, và không có RPC nào làm sẵn
  // phép group by này.
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('visits')
      .select('region, city, country')
      .is('region_iso', null)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break

    for (const row of data) {
      const key = JSON.stringify([row.region, row.city, row.country])
      const found = byKey.get(key)
      if (found) found.rows++
      else byKey.set(key, { region: row.region, city: row.city, country: row.country, rows: 1 })
    }

    if (data.length < PAGE_SIZE) break
  }

  return [...byKey.values()].sort((a, b) => b.rows - a.rows)
}

/** `.eq()` không khớp NULL — dùng sai thì câu update lặng lẽ không chạm hàng nào */
function whereNullable<T extends { eq: Function; is: Function }>(
  query: T,
  column: string,
  value: string | null
): T {
  return value === null ? query.is(column, null) : query.eq(column, value)
}

async function main() {
  const combos = await distinctCombos()
  if (combos.length === 0) {
    console.log('Không còn hàng nào có region_iso NULL. Xong.')
    return
  }

  let resolved = 0
  let unresolved = 0
  let written = 0

  console.log(`${combos.length} tổ hợp (country | region | city) cần xử:\n`)

  for (const combo of combos) {
    const province = combo.country === 'VN' ? resolveVisitProvince(combo) : undefined
    const regionIso =
      province?.code ?? (combo.country === 'VN' ? null : foreignIsoCode(combo.region))
    const boundaryVersion = province ? VN_BOUNDARY_VERSION : null

    const label = `${combo.country || '∅'} | ${combo.region || '∅'} | ${combo.city || '∅'}`
    const count = String(combo.rows).padStart(6)

    if (!regionIso) {
      unresolved += combo.rows
      console.log(`  ${count}  ${label}  →  chưa nhận ra, để NULL`)
      continue
    }

    resolved += combo.rows
    const suffix = boundaryVersion ? `@ ${boundaryVersion}` : '(mã nước khác, chưa rõ bộ ranh giới)'
    console.log(`  ${count}  ${label}  →  ${regionIso} ${suffix}`)
    if (dryRun) continue

    let query: any = supabase
      .from('visits')
      .update(
        { region_iso: regionIso, region_boundary_version: boundaryVersion },
        { count: 'exact' }
      )
      .is('region_iso', null)
    query = whereNullable(query, 'region', combo.region)
    query = whereNullable(query, 'city', combo.city)
    query = whereNullable(query, 'country', combo.country)

    const { error, count: updated } = await query
    if (error) throw error
    written += updated ?? 0
  }

  const total = resolved + unresolved
  const pct = ((resolved / (total || 1)) * 100).toFixed(1)
  console.log(`\nnhận ra ${resolved}/${total} hàng (${pct}%), chưa nhận ra ${unresolved}`)
  console.log(dryRun ? '--dry-run: không ghi gì.' : `đã ghi ${written} hàng.`)
}

main().catch((error) => {
  console.error('Lỗi:', error)
  process.exit(1)
})
