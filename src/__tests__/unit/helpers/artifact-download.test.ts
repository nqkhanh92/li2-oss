import { describe, expect, it } from 'vitest'

import { attachmentDisposition, downloadFileName } from '@/core/helpers/artifact-download'

describe('downloadFileName', () => {
  it('ghép đuôi thật từ storage_path — tên artifact thường không có đuôi', () => {
    expect(downloadFileName('Báo giá tháng 9', 'org/uuid.pdf')).toBe('Báo giá tháng 9.pdf')
  })

  it('không nhân đôi đuôi khi tên đã có sẵn', () => {
    expect(downloadFileName('deck.pptx', 'org/uuid.pptx')).toBe('deck.pptx')
    expect(downloadFileName('deck.PPTX', 'org/uuid.pptx')).toBe('deck.PPTX')
  })

  it('.ppt và .pptx là hai đuôi khác nhau dù cùng một kind', () => {
    expect(downloadFileName('deck', 'org/uuid.ppt')).toBe('deck.ppt')
    expect(downloadFileName('deck', 'org/uuid.pptx')).toBe('deck.pptx')
  })

  it('tên rỗng vẫn ra một tên file dùng được', () => {
    expect(downloadFileName('   ', 'org/uuid.mp4')).toBe('artifact.mp4')
  })
})

describe('attachmentDisposition', () => {
  /**
   * The reason this helper exists at all: `undici` THROWS on a header byte outside ISO-8859-1, so a
   * Vietnamese artifact name interpolated raw is a 500, not a mangled filename.
   */
  it('dựng được header với tên tiếng Việt — và Response không ném', () => {
    const value = attachmentDisposition('Báo giá tháng 9.pdf')

    expect(() => new Response(null, { headers: { 'Content-Disposition': value } })).not.toThrow()
    expect(new Response(null, { headers: { 'Content-Disposition': value } }).headers.get(
      'content-disposition'
    )).toBe(value)
  })

  it('có cả filename ASCII và filename* UTF-8 đã percent-encode', () => {
    const value = attachmentDisposition('Báo giá.pdf')

    expect(value).toMatch(/^attachment; filename="[\x20-\x7e]*"; filename\*=UTF-8''/)
    expect(value).toContain("filename*=UTF-8''B%C3%A1o%20gi%C3%A1.pdf")
  })

  it('mọi ký tự ngoài ASCII in được đều biến mất khỏi filename fallback', () => {
    const fallback = attachmentDisposition('Báo giá tháng 9.pdf').match(/filename="([^"]*)"/)![1]

    expect(fallback).toBe('B_o gi_ th_ng 9.pdf')
    // eslint-disable-next-line no-control-regex
    expect(fallback).not.toMatch(/[^\x20-\x7e]/)
  })

  /**
   * A `"` in the name would close the quoted-string early and let the rest of the name be parsed as
   * further header parameters — a name the user types is not allowed to write header syntax.
   */
  it('dấu ngoặc kép và backslash trong tên không phá được cú pháp header', () => {
    const value = attachmentDisposition('a"; x=1\\b.pdf')

    // The `;` stays: inside a quoted-string it is ordinary text. The `"` and `\\` are what could
    // end the string early, and both are gone.
    expect(value.match(/filename="([^"]*)"/)![1]).toBe('a_; x=1_b.pdf')
  })

  it('escape cả những ký tự encodeURIComponent bỏ qua (\'()!*)', () => {
    const value = attachmentDisposition("it's (a)!*.pdf")

    expect(value.split("filename*=UTF-8''")[1]).toBe('it%27s%20%28a%29%21%2A.pdf')
  })
})
