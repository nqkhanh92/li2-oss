import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Contract test: mọi khoá i18n mà code artifact dùng phải tồn tại ở CẢ `vi` và `en`.
 *
 * Vì sao cần: khoá thiếu không hề gãy. i18next trả về chính chuỗi khoá, nên người dùng thấy
 * `messages.success.updated` trong toast còn test thì xanh — `artifact-components.test.tsx`
 * mock `t()` trả lại path, tức thiếu khoá trông y hệt có khoá. Đã xảy ra thật: bốn khoá
 * backend không tồn tại, và một trong số đó hiện lên sau **mỗi** lần publish thành công.
 *
 * Phạm vi cố ý chỉ là artifact. Quét toàn repo hiện ra 228 khoá thiếu trên 46 file — nợ có
 * sẵn của cả đội, không phải việc của tính năng này, và gộp vào đây thì test đỏ vĩnh viễn
 * rồi bị tắt. Mở rộng phạm vi là một quyết định riêng, sau khi dọn xong nợ đó.
 */

const ROOT = resolve(__dirname, '../../../..')
const LANGS = ['vi', 'en'] as const

/** Đường dẫn nguồn thuộc tính năng artifact. Test cũng nằm ngoài: test không hiện cho người dùng. */
const ARTIFACT_SOURCES = [
  'src/core/services/artifact.service.ts',
  'src/core/services/artifact-serve.service.ts',
  'src/core/types/artifact.type.ts',
  'src/features/artifacts',
  'src/app/(artifact)',
  'src/app/api/organizations/[org_id]/artifacts',
  'src/app/(protected)/org/[org_id]/artifacts',
]

const loadNamespaces = (lang: string) => {
  const dir = join(ROOT, 'public/lang', lang)
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(dir, f), 'utf8'))])
  ) as Record<string, unknown>
}

const lookup = (obj: unknown, dotted: string) =>
  dotted.split('.').reduce<any>((acc, part) => (acc == null ? acc : acc[part]), obj)

const walk = (target: string): string[] => {
  const abs = join(ROOT, target)
  let stat
  try {
    stat = statSync(abs)
  } catch {
    return []
  }
  if (stat.isFile()) return /\.tsx?$/.test(abs) ? [abs] : []
  return readdirSync(abs).flatMap((entry) => walk(join(target, entry)))
}

/** `'ns:a.b.c'` trong literal, và `$t(label.x)` lồng trong params (i18next nội suy khoá này). */
const NS_KEY = /['"`]([a-z][a-z0-9_-]*):((?:[A-Za-z0-9_]+\.)+[A-Za-z0-9_]+)['"`]/g
const NESTED_T = /\$t\(([A-Za-z0-9_.]+)\)/g

describe('khoá i18n của artifact tồn tại ở cả vi và en', () => {
  const dicts = Object.fromEntries(LANGS.map((l) => [l, loadNamespaces(l)])) as Record<
    string,
    Record<string, unknown>
  >
  const files = ARTIFACT_SOURCES.flatMap(walk)

  it('tìm được file nguồn để quét', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  /**
   * Phần lớn khoá backend ném **không xuất hiện ở đâu trong FE** — chúng đi tới trình duyệt qua
   * `i18nMessage.key` lúc chạy. Thứ duy nhất khiến test này nhìn thấy chúng là hai file service
   * nằm trong `ARTIFACT_SOURCES`. Ai đó "dọn" danh sách về cho gọn, chỉ còn `src/features`, sẽ
   * **không làm test nào đỏ** — nó chỉ lặng lẽ thôi phủ đúng nhóm khoá đã nổ một lần rồi (bốn
   * khoá backend không tồn tại, một trong số đó hiện sau mỗi lần publish thành công).
   *
   * Kiểm theo **đường dẫn đã phân giải**, không theo chuỗi trong mảng: `walk()` trả `[]` im lặng
   * khi đường dẫn không tồn tại, nên một lỗi gõ trong `ARTIFACT_SOURCES` vẫn qua được phép so
   * chuỗi trong khi thực tế không quét gì cả.
   */
  it.each(['src/core/services/artifact.service.ts', 'src/core/services/artifact-serve.service.ts'])(
    'vẫn quét %s — nơi khoá backend-only sống',
    (source) => {
      expect(ARTIFACT_SOURCES).toContain(source)
      expect(files).toContain(join(ROOT, source))
    }
  )

  it.each(LANGS)('không khoá nào thiếu ở %s', (lang) => {
    const missing: string[] = []

    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      const rel = file.slice(ROOT.length + 1)

      for (const [, ns, key] of src.matchAll(NS_KEY)) {
        // Chỉ xét những tiền tố thật sự là namespace; `https:`, `text:` ... không phải.
        if (!(ns in dicts[lang])) continue
        if (lookup(dicts[lang][ns], key) === undefined) missing.push(`${rel}  ${ns}:${key}`)
      }

      // `$t(label.file)` trong params luôn phân giải trong namespace `common`.
      for (const [, key] of src.matchAll(NESTED_T)) {
        if (lookup(dicts[lang].common, key) === undefined) missing.push(`${rel}  common:${key}`)
      }
    }

    expect(missing, `khoá thiếu ở ${lang}:\n${missing.join('\n')}`).toEqual([])
  })
})

/**
 * Ba khoá của cổng quét, kiểm thẳng chứ không chỉ dựa vào phép quét ở trên.
 *
 * Vì sao cần riêng: phép quét chỉ nói "khoá có tồn tại". Thứ dễ sai ở đây là NỘI DUNG — cả ba khoá
 * cùng sinh ra từ một cổng, hai trong số đó cùng mã 400, và câu dành cho tập tin có mật khẩu mà lọt
 * chữ "mã độc" thì nói oan cho một tài liệu hoàn toàn hợp lệ. Đó đúng là lỗi đã xảy ra: bật
 * `AlertEncryptedArchive` làm một PDF đặt mật khẩu nhận câu "tập tin có mã độc".
 */
describe('câu của cổng quét', () => {
  const dicts = Object.fromEntries(LANGS.map((l) => [l, loadNamespaces(l)])) as Record<
    string,
    Record<string, unknown>
  >
  const sentence = (lang: string, key: string) =>
    lookup(dicts[lang].artifact, `errors.${key}`) as string | undefined

  it.each(LANGS)('%s có cả ba khoá, và ba câu khác nhau', (lang) => {
    const encrypted = sentence(lang, 'scan_encrypted')
    const infected = sentence(lang, 'scan_infected')
    const unavailable = sentence(lang, 'scan_unavailable')

    expect(typeof encrypted).toBe('string')
    expect(typeof infected).toBe('string')
    expect(typeof unavailable).toBe('string')
    expect(new Set([encrypted, infected, unavailable]).size).toBe(3)
  })

  it('câu tiếng Việt nói đủ ba ý: có mật khẩu, không kiểm tra được, tải bản không mật khẩu', () => {
    const vi = sentence('vi', 'scan_encrypted')!
    expect(vi).toContain('mật khẩu')
    expect(vi).toMatch(/không.*kiểm tra/)
    expect(vi).toMatch(/tải lên bản không đặt mật khẩu/)
  })

  it.each(LANGS)('câu scan_encrypted ở %s không nói mã độc', (lang) => {
    expect(sentence(lang, 'scan_encrypted')).not.toMatch(/mã độc|nhiễm|virus|malware|infected/i)
  })
})
