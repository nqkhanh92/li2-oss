import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  maxUploadBytes,
  safeStoragePath,
  sha256Hex,
} from '@/lib/artifacts/storage'
import {
  checkUpload,
  extensionOf,
  isActiveContent,
  sanitizeOriginalName,
} from '@/lib/artifacts/mime'

const ROOT = '/data/artifacts'

describe('safeStoragePath — chống path traversal', () => {
  it('nhận đường dẫn tương đối nằm trong gốc', () => {
    const result = safeStoragePath('2026/11/abc.pdf', ROOT)
    expect(result).toEqual({ ok: true, absolute: '/data/artifacts/2026/11/abc.pdf' })
  })

  it('chặn `..` leo ra ngoài', () => {
    expect(safeStoragePath('../../etc/passwd', ROOT).ok).toBe(false)
    expect(safeStoragePath('2026/../../../etc/passwd', ROOT).ok).toBe(false)
  })

  it('chặn thư mục NGANG HÀNG có cùng tiền tố chuỗi', () => {
    // Đây là ca mà `absolute.startsWith(root)` bỏ lọt: `/data/artifacts-evil/x.pdf` có đúng tiền
    // tố `/data/artifacts`, nhưng nó là thư mục khác.
    const relative = '../artifacts-evil/x.pdf'
    const result = safeStoragePath(relative, ROOT)

    expect(result.ok).toBe(false)

    // Chứng minh vì sao phép kiểm bằng tiền tố chuỗi là sai: nó CHO QUA đúng ca này.
    const absolute = path.resolve(ROOT, relative)
    expect(absolute).toBe('/data/artifacts-evil/x.pdf')
    expect(absolute.startsWith(ROOT)).toBe(true)
  })

  it('chặn đường dẫn tuyệt đối', () => {
    expect(safeStoragePath('/etc/passwd', ROOT).ok).toBe(false)
    expect(safeStoragePath('/data/artifacts/2026/11/abc.pdf', ROOT).ok).toBe(false)
  })

  it('chặn byte NUL và chuỗi rỗng', () => {
    expect(safeStoragePath('a\u0000b.pdf', ROOT).ok).toBe(false)
    expect(safeStoragePath('', ROOT).ok).toBe(false)
  })

  it('chặn đường dẫn trỏ vào chính thư mục gốc', () => {
    expect(safeStoragePath('.', ROOT).ok).toBe(false)
    expect(safeStoragePath('2026/..', ROOT).ok).toBe(false)
  })

  it('gốc không chuẩn hoá vẫn được xử đúng', () => {
    expect(safeStoragePath('x.pdf', '/data/./artifacts/').ok).toBe(true)
    expect(safeStoragePath('../x.pdf', '/data/./artifacts/').ok).toBe(false)
  })
})

describe('maxUploadBytes', () => {
  it('mặc định 30 MiB khi env thiếu hoặc rác', () => {
    const original = process.env.MAX_UPLOAD_BYTES
    try {
      delete process.env.MAX_UPLOAD_BYTES
      expect(maxUploadBytes()).toBe(DEFAULT_MAX_UPLOAD_BYTES)

      // Giá trị rác không được âm thầm thành "không giới hạn".
      process.env.MAX_UPLOAD_BYTES = 'rất lớn'
      expect(maxUploadBytes()).toBe(DEFAULT_MAX_UPLOAD_BYTES)
      process.env.MAX_UPLOAD_BYTES = '-1'
      expect(maxUploadBytes()).toBe(DEFAULT_MAX_UPLOAD_BYTES)

      process.env.MAX_UPLOAD_BYTES = '1024'
      expect(maxUploadBytes()).toBe(1024)
    } finally {
      if (original === undefined) delete process.env.MAX_UPLOAD_BYTES
      else process.env.MAX_UPLOAD_BYTES = original
    }
  })
})

describe('sha256Hex', () => {
  it('khớp giá trị sha256 đã biết của chuỗi rỗng', () => {
    expect(sha256Hex(new Uint8Array())).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    )
  })
})

// ───────────────────────────────────────────────────────────────────── MIME

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01])
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
])
/** ELF — không có trong allowlist dưới bất kỳ đuôi nào. */
const ELF = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00])

function text(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

describe('extensionOf', () => {
  it('lấy đuôi CUỐI, chữ thường', () => {
    expect(extensionOf('bao-cao.PDF')).toBe('pdf')
    expect(extensionOf('evil.php.txt')).toBe('txt')
    expect(extensionOf('evil.txt.php')).toBe('php')
    expect(extensionOf('../../etc/passwd.png')).toBe('png')
  })

  it('không có đuôi thì trả rỗng', () => {
    expect(extensionOf('Makefile')).toBe('')
    expect(extensionOf('.htaccess')).toBe('')
    expect(extensionOf('ten.')).toBe('')
  })
})

describe('checkUpload — allowlist', () => {
  it('nhận các loại hợp lệ và chuẩn hoá MIME theo đuôi', () => {
    expect(checkUpload({ bytes: PDF, originalName: 'a.pdf' })).toEqual({
      ok: true,
      mime: 'application/pdf',
      ext: 'pdf',
    })
    expect(checkUpload({ bytes: PNG, originalName: 'a.png' })).toMatchObject({ mime: 'image/png' })
    expect(checkUpload({ bytes: JPEG, originalName: 'a.jpg' })).toMatchObject({
      mime: 'image/jpeg',
    })
    expect(checkUpload({ bytes: WEBP, originalName: 'a.webp' })).toMatchObject({
      mime: 'image/webp',
    })
    expect(checkUpload({ bytes: ZIP, originalName: 'a.docx' })).toMatchObject({
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    expect(checkUpload({ bytes: text('<h1>chào</h1>'), originalName: 'a.html' })).toMatchObject({
      mime: 'text/html',
    })
    expect(checkUpload({ bytes: text('a,b\n1,2\n'), originalName: 'a.csv' })).toMatchObject({
      mime: 'text/csv',
    })
  })

  it('từ chối .exe và .php bất kể nội dung', () => {
    expect(checkUpload({ bytes: ELF, originalName: 'payload.exe' }).ok).toBe(false)
    expect(checkUpload({ bytes: text('<?php system($_GET[0]); ?>'), originalName: 'x.php' }).ok).toBe(
      false
    )
    // Kể cả khi nội dung là một PDF thật — đuôi không nằm trong allowlist là hết.
    expect(checkUpload({ bytes: PDF, originalName: 'x.php' }).ok).toBe(false)
  })

  it('từ chối khi `file.type` nói dối', () => {
    // Client khai application/pdf nhưng nội dung là ELF, đuôi là .pdf.
    const result = checkUpload({
      bytes: ELF,
      originalName: 'bao-cao.pdf',
      declaredType: 'application/pdf',
    })
    expect(result.ok).toBe(false)

    // Và chiều ngược lại: nội dung PDF thật, client khai sai — vẫn nhận, vì `file.type` không
    // được dùng để quyết định điều gì.
    expect(
      checkUpload({ bytes: PDF, originalName: 'a.pdf', declaredType: 'application/x-msdownload' })
    ).toMatchObject({ ok: true, mime: 'application/pdf' })
  })

  it('từ chối nội dung không khớp đuôi (zip đổi tên thành pdf)', () => {
    expect(checkUpload({ bytes: ZIP, originalName: 'a.pdf' }).ok).toBe(false)
    expect(checkUpload({ bytes: PNG, originalName: 'a.jpg' }).ok).toBe(false)
  })

  it('từ chối tệp rỗng và tệp không đuôi', () => {
    expect(checkUpload({ bytes: new Uint8Array(), originalName: 'a.pdf' }).ok).toBe(false)
    expect(checkUpload({ bytes: PDF, originalName: 'Makefile' }).ok).toBe(false)
  })

  it('nhóm văn bản: từ chối nhị phân đội lốt .txt', () => {
    // Giới hạn đã biết: không có magic bytes cho văn bản, nên chặn bằng dấu hiệu nhị phân.
    const withNul = new Uint8Array([0x68, 0x69, 0x00, 0x68, 0x69])
    expect(checkUpload({ bytes: withNul, originalName: 'a.txt' }).ok).toBe(false)

    // Chuỗi byte không phải UTF-8 hợp lệ.
    const badUtf8 = new Uint8Array([0xc3, 0x28, 0xa0, 0xa1])
    expect(checkUpload({ bytes: badUtf8, originalName: 'a.md' }).ok).toBe(false)
  })
})

describe('sanitizeOriginalName', () => {
  it('bỏ thành phần đường dẫn', () => {
    expect(sanitizeOriginalName('../../etc/passwd')).toBe('passwd')
    expect(sanitizeOriginalName('C:\\Windows\\win.ini')).toBe('win.ini')
  })

  it('bỏ CR/LF — tên tệp đi vào header Content-Disposition', () => {
    expect(sanitizeOriginalName('a\r\nSet-Cookie: x=1.pdf')).toBe('aSet-Cookie: x=1.pdf')
  })

  it('tên rỗng sau khi làm sạch thì có tên thay thế', () => {
    expect(sanitizeOriginalName('   ')).toBe('tep-khong-ten')
    expect(sanitizeOriginalName('\u0000')).toBe('tep-khong-ten')
  })

  it('cắt ở 255 ký tự', () => {
    expect(sanitizeOriginalName('a'.repeat(1000))).toHaveLength(255)
  })
})

describe('isActiveContent', () => {
  it('HTML và SVG là nội dung sống, phải phục vụ dưới CSP sandbox', () => {
    expect(isActiveContent('text/html')).toBe(true)
    // SVG mở ở tab riêng là một document và chạy được <script> — bỏ qua nó là XSS lưu trữ.
    expect(isActiveContent('image/svg+xml')).toBe(true)
  })

  it('PDF và ảnh raster thì không', () => {
    expect(isActiveContent('application/pdf')).toBe(false)
    expect(isActiveContent('image/png')).toBe(false)
    expect(isActiveContent('text/plain')).toBe(false)
  })
})
