#!/usr/bin/env node
/**
 * Áp `db/schema.sql` vào DATABASE_URL.
 *
 * Khi nào cần script này: `docker compose up` đã mount schema vào
 * /docker-entrypoint-initdb.d/, nên lần `up` ĐẦU TIÊN trên một volume rỗng đã có bảng sẵn.
 * Script này dành cho hai trường hợp còn lại — chạy với một Postgres có từ trước (ví dụ
 * Postgres do nhà cung cấp quản lý), hoặc áp lại schema sau khi đã `docker volume rm`.
 *
 * Về "idempotent": schema dùng `CREATE TABLE` trần, không `IF NOT EXISTS`. Đó là lựa chọn của
 * schema và không sửa ở đây — `IF NOT EXISTS` làm lần chạy thứ hai IM LẶNG bỏ qua một bảng có
 * cấu trúc cũ, và đó là cách hỏng tệ hơn một lỗi. Nên script này không cố làm cho việc chạy
 * lại thành công; nó làm cho việc chạy lại thành MỘT CÂU ĐỌC ĐƯỢC thay vì một stack trace.
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const here = dirname(fileURLToPath(import.meta.url))
const schemaPath = join(here, '..', 'db', 'schema.sql')

function fail(message) {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  fail(
    'DATABASE_URL chưa được đặt.\n' +
      '  Chạy ngoài Docker: sao chép .env.example thành .env rồi điền DATABASE_URL.\n' +
      '  Chạy trong Docker: docker compose exec web node scripts/db-init.mjs'
  )
}

let schema
try {
  schema = await readFile(schemaPath, 'utf8')
} catch {
  fail(`Không đọc được ${schemaPath}. File db/schema.sql phải đi cùng repo.`)
}

const client = new pg.Client({ connectionString })

try {
  await client.connect()
} catch (error) {
  fail(
    `Không kết nối được Postgres: ${error.message}\n` +
      '  Kiểm DATABASE_URL, và kiểm container db đã healthy chưa:\n' +
      '    docker compose ps'
  )
}

try {
  // Một transaction: schema áp hết hoặc không áp gì. Nửa schema là trạng thái không ai gỡ được.
  await client.query('BEGIN')
  await client.query(schema)
  await client.query('COMMIT')
  console.log('✓ Đã áp db/schema.sql.')
  console.log('  Bước tiếp theo: tạo tài khoản admin bằng `yarn db:seed`.')
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})

  // 42P07 = duplicate_table, 42710 = duplicate_object (type/trigger đã có).
  const duplicate =
    error.code === '42P07' ||
    error.code === '42710' ||
    /already exists/i.test(error.message ?? '')

  if (duplicate) {
    console.log('\nℹ Schema đã được áp trước đó — không có gì để làm.')
    console.log(`  (Postgres báo: ${error.message})`)
    console.log('\n  Nếu bạn MUỐN dựng lại từ đầu thì phải xoá dữ liệu cũ một cách có ý thức:')
    console.log('    docker compose down && docker volume rm li2-oss_db_data && docker compose up')
    console.log('  ⚠ Lệnh đó xoá toàn bộ link, artifact và thống kê. Không khôi phục được.')
    console.log('\n  Nếu bạn muốn ĐỔI schema của một DB đang có dữ liệu: viết một file ALTER tay.')
    console.log('  v1 chưa có hệ thống migration — xem docs/ROADMAP.md.')
    process.exit(0)
  }

  fail(`Áp schema thất bại: ${error.message}${error.code ? ` (SQLSTATE ${error.code})` : ''}`)
} finally {
  await client.end().catch(() => {})
}
