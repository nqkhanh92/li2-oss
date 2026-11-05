import { describe, it, expect } from 'vitest'
import { markdownPage } from '@/app/(artifact)/a/_lib/markdown-page'

/**
 * Markdown CHO PHÉP HTML thô, nên một file .md là một vector XSS y như một file .html — chỉ khác
 * là người đọc không nghĩ vậy. Hai lớp chặn: `rehypeSanitize` khi dựng (kiểm ở đây) và CSP
 * sandbox khi phục vụ (kiểm ở `artifact-csp.test.ts`).
 */
describe('markdownPage — dựng HTML từ markdown', () => {
  const render = (md: string) => markdownPage('Tài liệu', md, 'vi')

  it('dựng được markdown cơ bản thành thẻ HTML', () => {
    const html = render('# Tiêu đề\n\nMột đoạn **đậm**.')
    expect(html).toContain('<h1>Tiêu đề</h1>')
    expect(html).toContain('<strong>đậm</strong>')
  })

  it('bảng GFM chạy — đó là thứ người ta thật sự viết trong .md', () => {
    const html = render('| A | B |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })

  // Hai ca dưới đỏ khi gỡ `rehypeSanitize` — đã kiểm ngược.
  it('CẮT thẻ script người dùng gõ thẳng vào markdown', () => {
    const html = render('Xin chào\n\n<script>alert(1)</script>')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('alert(1)')
  })

  it('CẮT thuộc tính sự kiện inline', () => {
    const html = render('<p onclick="alert(1)">bấm tôi</p>')
    expect(html).not.toContain('onclick')
  })

  /**
   * Hai ca dưới đây xanh kể cả khi gỡ `rehypeSanitize` — đo rồi: react-markdown mặc định không
   * render HTML thô, và nó có phép lọc URI riêng cho `javascript:`. Giữ lại vì chúng chốt HÀNH VI
   * cần có, không phải chốt một thư viện: đổi sang `rehype-raw` hay một renderer khác mà quên
   * tầng lọc là hai test này đỏ.
   */
  it('CẮT iframe — khung nhúng là đường vòng quanh mọi thứ khác', () => {
    expect(render('<iframe src="https://evil.test"></iframe>')).not.toContain('<iframe')
  })

  it('CẮT link javascript:', () => {
    const html = render('[bấm](javascript:alert(1))')
    expect(html).not.toContain('javascript:alert')
  })

  it('giữ link http(s) bình thường — sanitize không được ăn cả nội dung lành', () => {
    const html = render('[li2](https://li2.ai)')
    expect(html).toContain('href="https://li2.ai"')
  })

  it('tên artifact được escape, không chèn thẳng vào tiêu đề trang', () => {
    const html = markdownPage('<script>x</script>', '# ok', 'vi')
    expect(html).not.toContain('<title><script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('kèm style inline — CSP sandbox chặn stylesheet ngoài, link rel=stylesheet sẽ chết im lặng', () => {
    const html = render('# ok')
    expect(html).toContain('<style>')
    expect(html).not.toContain('rel="stylesheet"')
  })

  it('markdown rỗng không ném', () => {
    expect(() => render('')).not.toThrow()
  })
})

/**
 * Hai hàng rào chống chính người tải file lên. Cả hai do agent `eng-artifact` tìm ra và tôi đo
 * lại độc lập trước khi sửa — xem chú thích trong `markdown-page.ts`.
 */
describe('markdownPage — không được làm sập route công khai', () => {
  it('blockquote lồng sâu KHÔNG ném — trước đây là RangeError rồi thành 500', () => {
    // Đo được: 2000 cấp đã ném, 1000 thì chưa. File này chỉ 5 KB và qua hết mọi cổng upload.
    const evil = '>'.repeat(5000) + ' x'
    expect(() => markdownPage('t', evil, 'vi')).not.toThrow()
  })

  it('đầu vào ném thì trả trang mời tải về, không phải trang trắng', () => {
    const html = markdownPage('t', '>'.repeat(5000) + ' x', 'vi')
    expect(html).toContain('Không hiển thị được')
    expect(html).toContain('<article class="markdown">')
  })

  it('file quá lớn thì KHÔNG parse — parse là bậc hai, 195 KB đã mất 5,7 giây', () => {
    // 300 KB > trần 256 KB. Nếu nhánh chặn hỏng, nội dung ác ý này sẽ chạy hàng giây.
    const huge = '[a](b'.repeat(70_000)
    const t0 = Date.now()
    const html = markdownPage('t', huge, 'vi')
    const elapsed = Date.now() - t0

    expect(html).toContain('quá lớn')
    // Trả ngay, không parse: đo ngưỡng rộng tay để không giòn trên máy chậm.
    expect(elapsed).toBeLessThan(500)
  })

  it('file vừa phải vẫn render bình thường — hàng rào không được ăn nội dung lành', () => {
    const ok = '# Tiêu đề\n\n' + 'Một đoạn văn.\n\n'.repeat(500)
    const html = markdownPage('t', ok, 'vi')
    expect(html).toContain('<h1>Tiêu đề</h1>')
    expect(html).not.toContain('quá lớn')
  })

  it('trần tính theo BYTE, không theo ký tự — chữ Việt có dấu tốn 2–3 byte', () => {
    // Đo: 'a' 1 byte, 'à' 2 byte, 'ế' 3 byte. 100k ký tự 'ế' = ~293 KB > trần 256 KB, trong khi
    // `source.length` chỉ là 100 000 — đếm theo ký tự sẽ cho lọt.
    const vi = 'ế'.repeat(100_000)
    expect(vi.length).toBeLessThan(256 * 1024)
    expect(Buffer.byteLength(vi, 'utf8')).toBeGreaterThan(256 * 1024)
    expect(markdownPage('t', vi, 'vi')).toContain('quá lớn')
  })
})
