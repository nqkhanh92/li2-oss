import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

import { landingShell } from '@/core/helpers/artifact-landing-shell'
import { escapeHtml, type ArtifactLandingLanguage } from '@/core/helpers/artifact-landing'

/**
 * Markdown → HTML, dựng ở server.
 *
 * `rehypeSanitize` chạy SAU khi markdown thành cây HTML, nên nó bỏ cả thẻ người dùng gõ thẳng
 * (`<script>`, `<iframe>`, `onclick=`) — markdown cho phép HTML thô, nên không sanitize là mở
 * đúng lỗ mà kind `html` phải dùng sandbox để bịt. Và `markdown` VẪN sandbox ở tầng CSP
 * (`ARTIFACT_KIND_SPECS`): sanitize là lớp một, sandbox là lớp hai phòng khi lớp một sót.
 *
 * `remarkGfm` để bảng, checkbox và ~~gạch ngang~~ chạy — đó là thứ người ta thực sự viết trong
 * một file .md, không phải CommonMark trần.
 *
 * KHÔNG dùng `react-markdown` + `renderToStaticMarkup`: Next App Router từ chối thẳng mọi import
 * `react-dom/server` ("You're importing a component that imports react-dom/server"), và nó chỉ nổ
 * lúc `yarn build` — vitest và tsc đều cho qua. Chuỗi `unified` thuần đổi lấy một dependency nhỏ
 * (`rehype-stringify`) để lấy một hàm chuỗi-vào-chuỗi-ra, không dính React.
 *
 * `allowDangerousHtml` KHÔNG bật ở `remarkRehype`: HTML thô trong .md bị bỏ ngay từ bước dựng cây,
 * trước cả khi `rehypeSanitize` nhìn tới. Hai tầng, và tầng ngoài là tầng rẻ nhất.
 *
 * **Hai hàng rào chống chính người tải file lên**, cả hai đều đo được chứ không phòng xa:
 *
 * 1. `MARKDOWN_RENDER_MAX_BYTES` — parse là BẬC HAI theo kích thước. Đo trên chuỗi này với nội
 *    dung `'[a](b'` lặp: 24 KB → 178 ms, 49 KB → 499 ms, 98 KB → 1,9 s, 195 KB → 5,7 s. Trần
 *    upload là 10 MB, và `processSync` chặn event loop của một process Next DUY NHẤT, nên một
 *    file vài trăm KB biến mỗi lượt quét QR thành vài giây cả app đứng im. Quá trần thì không
 *    render, chuyển sang trang mời tải về.
 *
 * 2. `try/catch` — `processSync` NÉM với đầu vào sâu. Đo: blockquote lồng 2000 cấp (một file 2 KB,
 *    qua hết mọi cổng: đuôi hợp lệ, không magic bytes, dưới 10 MB) → `RangeError: Maximum call
 *    stack size exceeded`. Không có handler nào trên đường từ route tới đây, nên nó thành 500 —
 *    một mã QR đã in trỏ vào link 500 vĩnh viễn, không có đường nào trong UI để sửa ngoài xoá.
 */
export function markdownPage(
  name: string,
  source: string,
  language: ArtifactLandingLanguage
): string {
  const tooBig = Buffer.byteLength(source, 'utf8') > MARKDOWN_RENDER_MAX_BYTES

  let body: string
  if (tooBig) {
    body = fallbackNotice(language, 'too_big')
  } else {
    try {
      body = String(
        unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkRehype)
          .use(rehypeSanitize)
          .use(rehypeStringify)
          .processSync(source)
      )
    } catch {
      // Nuốt có chủ ý: người quét QR không sửa được file, nên một trang nói "không hiển thị được,
      // tải về đi" hữu ích hơn một mã 500. Chủ artifact thấy nó khi tự mở link của mình.
      body = fallbackNotice(language, 'failed')
    }
  }

  return landingShell(
    escapeHtml(name),
    `<article class="markdown">${body}</article>${MARKDOWN_STYLE}`,
    language
  )
}

/**
 * 256 KB. Chọn từ bảng đo ở trên: trường hợp xấu nhất ở mức này là ~8 giây, còn một tài liệu
 * markdown viết tay bình thường hiếm khi quá vài chục KB — README của chính repo này là 12 KB.
 * Trần đặt theo BYTE chứ không theo số ký tự: tiếng Việt có dấu tốn 3 byte mỗi ký tự ở UTF-8.
 */
const MARKDOWN_RENDER_MAX_BYTES = 256 * 1024

/** Không đi qua i18n: file này nằm ngoài middleware và chỉ có hai ngôn ngữ landing. */
function fallbackNotice(language: ArtifactLandingLanguage, reason: 'too_big' | 'failed'): string {
  const text =
    language === 'vi'
      ? reason === 'too_big'
        ? 'File Markdown này quá lớn để hiển thị trực tiếp. Hãy tải về để xem.'
        : 'Không hiển thị được nội dung Markdown này. Hãy tải về để xem.'
      : reason === 'too_big'
        ? 'This Markdown file is too large to display here. Download it to read.'
        : 'This Markdown content could not be displayed. Download it to read.'

  return `<p>${escapeHtml(text)}</p>`
}

/**
 * Style đi kèm trong `<style>` chứ không phải file ngoài: trang này chạy dưới CSP sandbox với
 * `style-src 'unsafe-inline'` và `default-src 'none'`, nên một `<link rel=stylesheet>` sẽ bị
 * chặn im lặng và bài viết hiện ra trần trụi.
 */
const MARKDOWN_STYLE = `<style>
.markdown{max-width:48rem;margin:0 auto;text-align:left;line-height:1.7;color:#1e293b;font-size:16px}
.markdown h1,.markdown h2,.markdown h3,.markdown h4{line-height:1.3;margin:1.6em 0 .6em;font-weight:600}
.markdown h1{font-size:1.8em}
.markdown h2{font-size:1.45em;border-bottom:1px solid #e2e8f0;padding-bottom:.3em}
.markdown h3{font-size:1.2em}
.markdown p,.markdown ul,.markdown ol,.markdown blockquote,.markdown table{margin:0 0 1em}
.markdown ul,.markdown ol{padding-left:1.5em}
.markdown li{margin:.3em 0}
.markdown a{color:#4125B9;text-decoration:underline}
.markdown code{background:#f1f5f9;padding:.15em .4em;border-radius:4px;font-size:.9em}
.markdown pre{background:#0f172a;color:#e2e8f0;padding:1em;border-radius:8px;overflow-x:auto}
.markdown pre code{background:none;color:inherit;padding:0}
.markdown blockquote{border-left:3px solid #cbd5e1;padding-left:1em;color:#475569;font-style:italic}
.markdown table{border-collapse:collapse;width:100%}
.markdown th,.markdown td{border:1px solid #e2e8f0;padding:.5em .75em;text-align:left}
.markdown th{background:#f8fafc;font-weight:600}
.markdown img{max-width:100%;height:auto;border-radius:6px}
.markdown hr{border:0;border-top:1px solid #e2e8f0;margin:2em 0}
</style>`
