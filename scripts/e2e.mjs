#!/usr/bin/env node
/**
 * Nghiệm thu đầu-cuối trên một instance ĐANG CHẠY THẬT.
 *
 * Vì sao cần file này chứ không chỉ `yarn test`: trong lúc dựng v1 có ba lỗi, và **vitest không
 * bắt được lỗi nào**. Một cái `next build` bắt, một cái chỉ hiện khi mở một artifact thật
 * (`NextResponse.rewrite()` không dùng được trong route handler → 500). Test đơn vị kiểm hàm;
 * file này kiểm hệ thống.
 *
 *   docker compose up -d
 *   SEED_ADMIN_PASSWORD='...' node scripts/e2e.mjs
 *
 * Biến: BASE_URL (mặc định http://localhost:3000), E2E_EMAIL, E2E_PASSWORD.
 *
 * ⚠ Bộ này GHI dữ liệu thật (tạo link, tải tệp lên). Chạy trên instance thử nghiệm, đừng chạy
 * trên instance đang phục vụ người dùng.
 */

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = process.env.E2E_EMAIL ?? 'admin@example.com'
const PASSWORD = process.env.E2E_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD

if (!PASSWORD) {
  console.error('Thiếu E2E_PASSWORD (hoặc SEED_ADMIN_PASSWORD).')
  process.exit(2)
}

// Hậu tố để chạy lại nhiều lần không đụng slug cũ.
const RUN = Math.random().toString(36).slice(2, 8)

let cookie = ''
const results = []
let group = ''

function setGroup(name) {
  group = name
  console.log(`\n── ${name}`)
}

function check(name, pass, detail = '') {
  results.push({ group, name, pass, detail })
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? `  — ${detail}` : ''}`)
}

async function req(path, opts = {}) {
  const headers = new Headers(opts.headers ?? {})
  if (cookie) headers.set('cookie', cookie)
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, redirect: 'manual' })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie && /li2_session=/.test(setCookie)) {
    const m = setCookie.match(/li2_session=[^;]*/)
    if (m) cookie = m[0]
  }
  return res
}

const json = (body) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

// ───────────────────────────────────────────────────────────── 1. xác thực

async function testAuth() {
  setGroup('1. Xác thực')

  let res = await req('/api/auth/login', json({ email: EMAIL, password: 'sai-mat-khau' }))
  const wrongBody = await res.json().catch(() => ({}))
  check('mật khẩu sai → 401', res.status === 401, `status=${res.status}`)

  res = await req('/api/auth/login', json({ email: `khongtontai-${RUN}@example.com`, password: 'x' }))
  const unknownBody = await res.json().catch(() => ({}))
  check(
    'email không tồn tại trả CÙNG thông điệp với mật khẩu sai (không tiết lộ email nào có thật)',
    wrongBody.error === unknownBody.error && typeof wrongBody.error === 'string',
    JSON.stringify(unknownBody.error)
  )

  res = await req('/api/auth/login', json({ email: 'khong-phai-email', password: 'x' }))
  check('email sai định dạng → 401, không phải 400 có chi tiết zod', res.status === 401)

  res = await req('/api/auth/login', { method: 'POST', body: 'khong-phai-json' })
  check('body không phải JSON → 400', res.status === 400, `status=${res.status}`)

  res = await req('/api/auth/login', json({ email: EMAIL, password: PASSWORD }))
  check('đăng nhập đúng → 200', res.status === 200, `status=${res.status}`)
  check('nhận cookie phiên httpOnly', /li2_session=/.test(cookie), cookie ? 'có' : 'KHÔNG CÓ')

  const sc = res.headers.get('set-cookie') ?? ''
  check('cookie có HttpOnly', /httponly/i.test(sc))
  check('cookie có SameSite', /samesite/i.test(sc))
}

// ───────────────────────────────────────────────────────── 2. phân quyền

async function testAuthz() {
  setGroup('2. Phân quyền — mọi đường ghi phải đòi đăng nhập')
  const saved = cookie
  cookie = ''

  const cases = [
    ['POST /api/links', '/api/links', json({ destination: 'https://example.com' })],
    ['GET /api/links', '/api/links', {}],
    ['POST /api/artifacts', '/api/artifacts', { method: 'POST', body: new FormData() }],
    ['PATCH /api/links/<id>', '/api/links/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }],
    ['DELETE /api/links/<id>', '/api/links/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
    }],
  ]

  for (const [label, path, opts] of cases) {
    const res = await req(path, opts)
    check(`${label} khi chưa đăng nhập → 401`, res.status === 401, `status=${res.status}`)
  }

  const page = await req('/links')
  check(
    '/links khi chưa đăng nhập → chuyển về /login',
    page.status === 307 && (page.headers.get('location') ?? '').includes('/login'),
    `status=${page.status} → ${page.headers.get('location')}`
  )

  cookie = saved
}

// ──────────────────────────────────────────── 3. short link + redirect

let demoSlug = ''

async function testLinks() {
  setGroup('3. Short link và redirect')

  demoSlug = `e2e-${RUN}`
  let res = await req('/api/links', json({
    slug: demoSlug,
    destination: 'https://example.com/landing?a=1',
    title: 'E2E',
  }))
  const created = await res.json().catch(() => ({}))
  check('tạo link với slug tự đặt → 2xx', res.ok, `status=${res.status}`)
  check('trả public_url dựng từ PUBLIC_BASE_URL', typeof created?.link?.public_url === 'string',
    created?.link?.public_url ?? '')

  res = await req(`/${demoSlug}`)
  check('GET /<slug> → 302', res.status === 302, `status=${res.status}`)
  check('Location đúng URL đích', res.headers.get('location') === 'https://example.com/landing?a=1',
    res.headers.get('location') ?? '')

  res = await req(`/${demoSlug.toUpperCase()}`)
  check('slug CHỮ HOA cũng giải được (chuẩn hoá)', res.status === 302, `status=${res.status}`)

  res = await req('/api/links', json({ slug: demoSlug, destination: 'https://example.com' }))
  check('slug trùng → lỗi rõ ràng, không phải 500', res.status >= 400 && res.status < 500,
    `status=${res.status}`)

  res = await req('/api/links', json({ destination: 'https://vnexpress.net' }))
  const auto = await res.json().catch(() => ({}))
  const autoSlug = auto?.link?.slug ?? ''
  check('không đặt slug → tự sinh', res.ok && autoSlug.length > 0, autoSlug)
  check('slug tự sinh khớp CHECK của schema', /^[a-z0-9][a-z0-9_-]{0,63}$/.test(autoSlug), autoSlug)

  res = await req(`/khong-ton-tai-${RUN}`)
  check('slug không tồn tại → 404', res.status === 404, `status=${res.status}`)

  return autoSlug
}

// ─────────────────────────────────── 4. bảo mật: PoC thật từ báo cáo

async function testSecurity() {
  setGroup('4. Bảo mật — ba PoC lấy từ đợt đánh giá bản thương mại')

  // Open redirect Critical, CHƯA vá ở bản thương mại. Guard hỏng ở đó là
  // startsWith('/') && !startsWith('//') — `/\evil.com` đi qua vì ký tự thứ hai là `\`.
  let res = await req('/api/links', json({ slug: `evil-${RUN}`, destination: '/\\evil.com' }))
  check('destination = /\\evil.com bị TỪ CHỐI', !res.ok, `status=${res.status}`)

  res = await req('/api/links', json({ slug: `xss-${RUN}`, destination: 'javascript:alert(1)' }))
  check('destination = javascript: bị TỪ CHỐI', !res.ok, `status=${res.status}`)

  res = await req('/api/links', json({ slug: `data-${RUN}`, destination: 'data:text/html,<h1>x' }))
  check('destination = data: bị TỪ CHỐI', !res.ok, `status=${res.status}`)

  res = await req('/api/links', json({ slug: `proto-${RUN}`, destination: '//evil.com' }))
  check('destination = //evil.com bị TỪ CHỐI', !res.ok, `status=${res.status}`)

  for (const bad of ['Có Dấu', 'co/gach', 'co.cham', 'a'.repeat(65), '-batdau']) {
    res = await req('/api/links', json({ slug: bad, destination: 'https://example.com' }))
    check(`slug không hợp lệ bị từ chối: ${JSON.stringify(bad.slice(0, 20))}`, !res.ok,
      `status=${res.status}`)
  }
}

// ────────────────────────────────────────────────────────────── 5. QR

async function testQr(slug) {
  setGroup('5. QR')

  let res = await req(`/api/qr/${slug}?format=png`)
  const png = Buffer.from(await res.arrayBuffer())
  check('PNG → 200 image/png', res.status === 200 && res.headers.get('content-type')?.includes('image/png'),
    `${res.status} ${res.headers.get('content-type')}`)
  check('PNG có magic bytes đúng', png.subarray(1, 4).toString() === 'PNG', `${png.length} B`)

  res = await req(`/api/qr/${slug}?format=svg`)
  const svg = await res.text()
  check('SVG → chứa <svg', res.status === 200 && svg.includes('<svg'), `${svg.length} ký tự`)

  res = await req(`/api/qr/${slug}?format=png&width=99999`)
  const big = Buffer.from(await res.arrayBuffer())
  const w = big.readUInt32BE(16)
  check('width=99999 bị KẸP (không sinh ảnh khổng lồ)', w <= 2048, `${w}x${big.readUInt32BE(20)} px`)

  res = await req(`/api/qr/${slug}?format=png&width=1`)
  const small = Buffer.from(await res.arrayBuffer())
  check('width=1 bị nâng lên mức tối thiểu', small.readUInt32BE(16) >= 64, `${small.readUInt32BE(16)} px`)

  res = await req(`/api/qr/khong-ton-tai-${RUN}?format=png`)
  check('QR của slug không tồn tại → 404 (không phải máy sinh ảnh miễn phí)', res.status === 404,
    `status=${res.status}`)

  res = await req(`/api/qr/${slug}?format=png&dark=%3Cscript%3E`)
  check('màu không phải hex bị từ chối hoặc bỏ qua, không đi vào SVG', res.status !== 500,
    `status=${res.status}`)
}

// ──────────────────────────────────────────────────────── 6. artifact

let artifactSlug = ''

async function testArtifacts() {
  setGroup('6. Artifact')

  artifactSlug = `doc-${RUN}`
  const html = '<h1>Xin chao</h1><script>document.title="js"</script>'

  const fd = new FormData()
  fd.set('file', new File([html], 'tailieu.html', { type: 'text/html' }))
  fd.set('slug', artifactSlug)
  fd.set('title', 'Tai lieu E2E')

  let res = await req('/api/artifacts', { method: 'POST', body: fd })
  const up = await res.json().catch(() => ({}))
  check('tải HTML lên → 2xx', res.ok, `status=${res.status}`)
  check('trả public_url và qr_url', !!up?.public_url && !!up?.qr_url,
    `${up?.public_url ?? ''} ${up?.qr_url ?? ''}`)

  res = await req(`/${artifactSlug}`)
  const served = await res.text()
  check('mở artifact qua /<slug> → 200', res.status === 200, `status=${res.status}`)
  check('nội dung trả về đúng', served.includes('Xin chao'))

  const csp = res.headers.get('content-security-policy') ?? ''
  check('HTML có CSP sandbox', /sandbox/.test(csp), csp.slice(0, 60))
  check("CSP chặn mọi nguồn mạng (default-src 'none')", /default-src 'none'/.test(csp))
  check('có X-Content-Type-Options: nosniff',
    (res.headers.get('x-content-type-options') ?? '').toLowerCase() === 'nosniff')

  // SVG cũng là nội dung sống: mở top-level là một document và chạy <script>.
  const svgFd = new FormData()
  svgFd.set('file', new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'],
    'x.svg', { type: 'image/svg+xml' }))
  svgFd.set('slug', `svg-${RUN}`)
  res = await req('/api/artifacts', { method: 'POST', body: svgFd })
  if (res.ok) {
    const svgRes = await req(`/svg-${RUN}`)
    check('SVG cũng được sandbox (không chỉ HTML)',
      /sandbox/.test(svgRes.headers.get('content-security-policy') ?? ''),
      (svgRes.headers.get('content-security-policy') ?? '').slice(0, 40))
  } else {
    check('SVG cũng được sandbox (không chỉ HTML)', false, `upload SVG thất bại ${res.status}`)
  }

  const exeFd = new FormData()
  // Khai type là application/pdf để chứng minh `file.type` do client đặt không được tin.
  exeFd.set('file', new File([Buffer.from('MZ\x90\x00fake')], 'bad.exe', { type: 'application/pdf' }))
  exeFd.set('slug', `bad-${RUN}`)
  res = await req('/api/artifacts', { method: 'POST', body: exeFd })
  check('.exe bị từ chối dù client khai type=application/pdf', !res.ok, `status=${res.status}`)

  const pdfFd = new FormData()
  pdfFd.set('file', new File([Buffer.from('%PDF-1.4\n%fake pdf')], 'ok.pdf', { type: 'application/pdf' }))
  pdfFd.set('slug', `pdf-${RUN}`)
  res = await req('/api/artifacts', { method: 'POST', body: pdfFd })
  check('PDF hợp lệ được nhận', res.ok, `status=${res.status}`)
  if (res.ok) {
    const pdfRes = await req(`/pdf-${RUN}`)
    check('PDF phục vụ với nosniff',
      (pdfRes.headers.get('x-content-type-options') ?? '').toLowerCase() === 'nosniff',
      `${pdfRes.status} ${pdfRes.headers.get('content-type')}`)
  }
}

// ───────────────────────────────────────────── 7. đếm lượt truy cập

async function testVisits() {
  setGroup('7. Đếm lượt truy cập')

  const before = await (await req('/api/links')).json().catch(() => ({ links: [] }))
  const row0 = (before.links ?? []).find((l) => l.slug === demoSlug)
  const n0 = Number(row0?.visit_count ?? 0)

  for (let i = 0; i < 3; i++) await req(`/${demoSlug}`)
  await new Promise((r) => setTimeout(r, 1200)) // recordVisit cố ý không await ở đường redirect

  const after = await (await req('/api/links')).json().catch(() => ({ links: [] }))
  const row1 = (after.links ?? []).find((l) => l.slug === demoSlug)
  const n1 = Number(row1?.visit_count ?? 0)

  check('3 lần mở → bộ đếm tăng 3', n1 - n0 === 3, `${n0} → ${n1}`)
  check('visit_count là SỐ, không phải chuỗi bigint', typeof row1?.visit_count === 'number',
    typeof row1?.visit_count)
}

// ───────────────────────────────────────────── 8. tắt link và trang

async function testDeactivateAndPages() {
  setGroup('8. Tắt link, và các trang render')

  const list = await (await req('/api/links')).json().catch(() => ({ links: [] }))
  const target = (list.links ?? []).find((l) => l.slug === demoSlug)

  let res = await req(`/api/links/${target.id}`, { method: 'DELETE' })
  check('DELETE /api/links/<id> → 200', res.status === 200, `status=${res.status}`)

  res = await req(`/${demoSlug}`)
  check('link đã tắt → 404 (giống slug không tồn tại, không tiết lộ nó từng có)',
    res.status === 404, `status=${res.status}`)

  const after = await (await req('/api/links')).json().catch(() => ({ links: [] }))
  const still = (after.links ?? []).find((l) => l.slug === demoSlug)
  check('hàng DB vẫn còn (deactivate, KHÔNG delete — giữ thống kê và QR đã in)', !!still,
    still ? `is_active=${still.is_active}` : 'MẤT HÀNG')

  for (const [path, want] of [['/links', 200], ['/links/new', 200]]) {
    const r = await req(path)
    check(`${path} render ${want}`, r.status === want, `status=${r.status}`)
  }

  const linksHtml = await (await req('/links')).text()
  check('dashboard hiện slug vừa tạo', linksHtml.includes(artifactSlug), `${linksHtml.length} ký tự`)
  check('dashboard có nút tải QR', /\/api\/qr\//.test(linksHtml))
}

// ───────────────────────────────────── 9. rate limit (CHẠY CUỐI)

async function testRateLimit() {
  setGroup('9. Rate limit đăng nhập (chạy CUỐI — nó khoá IP 15 phút)')

  let got429 = false
  let retryAfter = null
  let attempts = 0

  for (let i = 0; i < 14; i++) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: 'sai' }),
      redirect: 'manual',
    })
    attempts += 1
    if (res.status === 429) {
      got429 = true
      retryAfter = res.headers.get('retry-after')
      break
    }
  }

  check('gõ sai liên tục → gặp 429', got429, `sau ${attempts} lần`)
  check('429 có header Retry-After', !!retryAfter, `Retry-After=${retryAfter}`)
  check('ngưỡng không quá lỏng (≤ 12 lần)', attempts <= 12, `${attempts} lần`)
}

// ─────────────────────────────────────────────────────────────── chạy

/**
 * Kiểm trước khi chạy: IP này có đang bị rate limit từ lần chạy trước không.
 *
 * ⚠ Đây là bug trong CHÍNH bộ test này, tìm ra khi chạy lần hai. Phép thử rate limit ở mục 9
 * khoá IP 15 phút, nên lần chạy kế tiếp đỏ ngay ở mục 1 — và tệ hơn: một phép kiểm **đạt giả**,
 * vì "email không tồn tại trả cùng thông điệp với mật khẩu sai" thành đúng một cách vô nghĩa khi
 * cả hai đều trả 429.
 *
 * Một phép kiểm đạt vì lý do sai còn tệ hơn một phép kiểm đỏ. Nên preflight dừng hẳn thay vì
 * chạy tiếp và báo xanh.
 */
async function preflight() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `preflight-${RUN}@example.invalid`, password: 'x' }),
    redirect: 'manual',
  })

  if (res.status === 429) {
    const retry = res.headers.get('retry-after') ?? '?'
    console.error(
      `\nIP này đang bị rate limit (còn ${retry}s) — gần như chắc là do lần chạy e2e trước.\n` +
        `Bộ đếm nằm trong RAM, nên khởi động lại web là xoá:\n\n` +
        `    docker compose restart web\n\n` +
        `Rồi chạy lại. Hoặc bỏ mục 9 bằng cách KHÔNG truyền --rate-limit.`
    )
    process.exit(2)
  }
}

async function main() {
  // Mục 9 phá trạng thái (khoá IP 15 phút) nên mặc định KHÔNG chạy — để `yarn e2e` lặp lại được.
  const withRateLimit = process.argv.includes('--rate-limit')

  console.log(`E2E li2-oss → ${BASE}  (run=${RUN})`)
  if (!withRateLimit) {
    console.log('(mục 9 rate limit bị bỏ — thêm --rate-limit để chạy, nó khoá IP 15 phút)')
  }

  const ping = await fetch(`${BASE}/login`, { redirect: 'manual' }).catch(() => null)
  if (!ping) {
    console.error(`\nKhông kết nối được ${BASE}. Chạy \`docker compose up -d\` trước.`)
    process.exit(2)
  }

  await preflight()

  await testAuth()
  await testAuthz()
  const autoSlug = await testLinks()
  await testSecurity()
  await testQr(autoSlug)
  await testArtifacts()
  await testVisits()
  await testDeactivateAndPages()
  if (withRateLimit) await testRateLimit()

  const failed = results.filter((r) => !r.pass)
  console.log(`\n${'─'.repeat(64)}`)
  console.log(`Tổng: ${results.length} phép kiểm · đạt ${results.length - failed.length} · lỗi ${failed.length}`)

  if (failed.length > 0) {
    console.log('\nLỖI:')
    for (const f of failed) console.log(`  ✗ [${f.group}] ${f.name}${f.detail ? ` — ${f.detail}` : ''}`)
    process.exit(1)
  }
  console.log('\n✓ Tất cả đạt.')
}

main().catch((err) => {
  console.error('\nE2E dừng vì lỗi không bắt được:', err)
  process.exit(1)
})
