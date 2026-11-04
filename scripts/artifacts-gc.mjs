#!/usr/bin/env node
/**
 * Dọn tệp artifact không còn được phục vụ.
 *
 * Vì sao cần một script riêng: xoá một artifact chỉ đổi `status` trong DB (và phải như vậy —
 * một địa chỉ công khai đã in lên vật phẩm thì không được biến thành 404 im lặng, nó cần một
 * trang "đã gỡ"). Nhưng không ai xoá **tệp**, nên volume phình mãi. Đây là lỗ do agent viết
 * phần artifact nêu ra, và ADR-001 bản đầu không nói ai dọn.
 *
 * Hai nhóm được dọn:
 *   1. `status = 'removed'`
 *   2. `expires_at < now()` — quá hạn thì nội dung không còn được phục vụ nữa
 *
 * Mặc định **chỉ in ra, không xoá**. Phải truyền `--apply` mới xoá thật. Một script dọn mà
 * mặc định xoá là một script sẽ xoá thứ không nên xoá đúng một lần nào đó.
 *
 *   node scripts/artifacts-gc.mjs            # xem sẽ xoá gì
 *   node scripts/artifacts-gc.mjs --apply    # xoá thật
 */

import { rm, stat } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import pg from 'pg'

const APPLY = process.argv.includes('--apply')

function storageRoot() {
  const dir = process.env.STORAGE_DIR
  if (!dir) {
    console.error('STORAGE_DIR chưa được đặt. Trong docker compose nó là /data/artifacts.')
    process.exit(1)
  }
  return resolve(dir)
}

/**
 * Chặn path traversal ngay cả ở script dọn. `storage_path` đến từ DB, và "dữ liệu từ DB của mình"
 * không phải lý do để tin — một hàng hỏng ở đây nghĩa là `rm` chạy ngoài thư mục lưu trữ.
 *
 * So sánh sau khi `resolve`, và cộng dấu phân cách: `/data/artifacts-evil` có tiền tố chuỗi là
 * `/data/artifacts` nhưng không nằm trong nó.
 */
function safeAbsolute(relative, root) {
  if (typeof relative !== 'string' || relative.length === 0) return null
  const absolute = resolve(root, relative)
  if (absolute !== root && !absolute.startsWith(root + sep)) return null
  return absolute
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL chưa được đặt.')
    process.exit(1)
  }

  const root = storageRoot()
  const client = new pg.Client({ connectionString })
  await client.connect()

  try {
    const { rows } = await client.query(
      `SELECT id, storage_path, status, expires_at
         FROM artifacts
        WHERE status = 'removed'
           OR (expires_at IS NOT NULL AND expires_at < now())
        ORDER BY created_at`
    )

    if (rows.length === 0) {
      console.log('Không có artifact nào cần dọn.')
      return
    }

    let bytes = 0
    let removed = 0
    let skipped = 0

    for (const row of rows) {
      const absolute = safeAbsolute(row.storage_path, root)
      if (!absolute) {
        console.warn(`! BỎ QUA ${row.id}: storage_path nằm ngoài STORAGE_DIR — ${row.storage_path}`)
        skipped += 1
        continue
      }

      let size = 0
      try {
        size = (await stat(absolute)).size
      } catch {
        // Tệp đã không còn. Không phải lỗi — có thể lần dọn trước đã xoá.
        continue
      }

      const why = row.status === 'removed' ? 'removed' : 'hết hạn'
      if (APPLY) {
        await rm(absolute, { force: true })
        console.log(`- đã xoá ${row.storage_path} (${size} B, ${why})`)
      } else {
        console.log(`- sẽ xoá ${row.storage_path} (${size} B, ${why})`)
      }
      bytes += size
      removed += 1
    }

    const mb = (bytes / 1024 / 1024).toFixed(2)
    console.log(
      APPLY
        ? `\n✓ Đã xoá ${removed} tệp, giải phóng ${mb} MB.`
        : `\n${removed} tệp sẽ được xoá, ${mb} MB. Chạy lại với --apply để xoá thật.`
    )
    if (skipped > 0) console.log(`⚠ ${skipped} hàng bị bỏ qua vì storage_path không an toàn.`)

    // Hàng DB được GIỮ LẠI có chủ ý: nó là bằng chứng một slug đã từng tồn tại, và đường phục vụ
    // cần nó để trả trang "đã gỡ" thay vì 404 cho một QR đã in.
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
