import { describe, it, expect, vi, beforeEach } from 'vitest'

const upload = vi.fn()
vi.mock('@/infrastructure/database/supabase', () => ({
  supabaseService: { storage: { from: () => ({ upload }) } },
}))

const { put } = await import('@/infrastructure/storage/artifact-storage')

/**
 * Đo thật trên LiHi 2026-10-24 bởi agent `test-artifact`: khi migration thêm markdown/Office/ảnh
 * chưa được áp, upload `.md` trả 500 kèm câu "Tệp tải lên thất bại, vui lòng thử lại với tệp
 * khác." — chỉ sai hướng, vì mọi tệp cùng định dạng đều hỏng y hệt.
 */
describe('put — bucket từ chối MIME là lỗi cấu hình, không phải lỗi tệp', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    'mime type text/markdown is not supported',
    'mime type image/png is not supported',
    'mime type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet is not supported',
  ])('“%s” → khoá i18n nói định dạng chưa được bật', async (message) => {
    upload.mockResolvedValue({ data: null, error: { message } })

    await expect(put('org/a.md', Buffer.from('x'), 'text/markdown')).rejects.toMatchObject({
      i18nMessage: { key: 'common:messages.error.format_not_enabled' },
    })
  })

  it('lỗi storage KHÁC vẫn giữ câu cũ — không nuốt mọi lỗi vào một rọ', async () => {
    upload.mockResolvedValue({ data: null, error: { message: 'network unreachable' } })

    await expect(put('org/a.html', Buffer.from('x'), 'text/html')).rejects.toMatchObject({
      i18nMessage: { key: 'common:messages.error.upload_failed' },
    })
  })

  it('thành công thì trả path, không ném', async () => {
    upload.mockResolvedValue({ data: { path: 'org/a.html' }, error: null })
    await expect(put('org/a.html', Buffer.from('x'), 'text/html')).resolves.toEqual({
      path: 'org/a.html',
    })
  })
})
