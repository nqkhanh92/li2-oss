import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ArtifactQuickPublish } from '@/features/artifacts/components/artifact-quick-publish'
import { ARTIFACT_MAX_BYTES } from '@/core/types/artifact.type'

const createArtifact = vi.fn()
const publishArtifact = vi.fn()
const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock('next/navigation', () => ({ useParams: () => ({ org_id: 'org-1' }) }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}))
vi.mock('sonner', () => ({
  toast: {
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}))
vi.mock('@/features/artifacts/hooks/use-artifacts', () => ({
  useCreateArtifact: () => ({ mutateAsync: createArtifact }),
  usePublishArtifact: () => ({ mutateAsync: publishArtifact }),
}))
vi.mock('@/features/artifacts/components/artifact-created-dialog', () => ({
  ArtifactCreatedDialog: ({ shortUrl }: { shortUrl: string }) => (
    <div data-testid="created-dialog" data-url={shortUrl} />
  ),
}))

const fileOf = (name: string, size = 1024) => {
  const file = new File(['x'], name, { type: 'text/html' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Dropzone nay là một <label> bọc cả icon lẫn chữ (đổi 2026-10-23 cho khớp trang tạo đầy đủ).
const drop = (file: File) => {
  const zone = screen.getByText('artifact:quick.title').closest('label')!
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
}

describe('ArtifactQuickPublish — thả file là xuất bản luôn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createArtifact.mockResolvedValue({ id: 'art-1' })
    publishArtifact.mockResolvedValue({ short_url: 'https://lihi.test/abc123' })
  })

  it('thả một file hợp lệ thì tải lên rồi xuất bản trong một lượt', async () => {
    render(<ArtifactQuickPublish />)
    drop(fileOf('bao-cao.html'))

    await waitFor(() => expect(publishArtifact).toHaveBeenCalledTimes(1))
    expect(createArtifact).toHaveBeenCalledTimes(1)
    expect(createArtifact.mock.calls[0][0].file.name).toBe('bao-cao.html')

    const payload = publishArtifact.mock.calls[0][0]
    expect(payload.artifact_id).toBe('art-1')
    expect(payload.access_mode).toBe('public')
    // Slug phải tự sinh, không để backend đoán, và phải hợp lệ.
    expect(payload.slug).toMatch(/^[a-z0-9]{10}$/)
  })

  it('xuất bản xong thì hiện hộp thoại kèm đúng link', async () => {
    render(<ArtifactQuickPublish />)
    drop(fileOf('a.html'))
    await waitFor(() => expect(screen.getByTestId('created-dialog')).toBeTruthy())
    expect(screen.getByTestId('created-dialog').getAttribute('data-url')).toBe(
      'https://lihi.test/abc123'
    )
  })

  it('đuôi file không nhận thì chặn ngay, không gọi API', async () => {
    render(<ArtifactQuickPublish />)
    drop(fileOf('virus.exe'))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(createArtifact).not.toHaveBeenCalled()
    expect(toastError.mock.calls[0][0]).toContain('wrong_type')
  })

  it('file quá lớn thì chặn ngay, không gọi API', async () => {
    render(<ArtifactQuickPublish />)
    drop(fileOf('to-qua.html', ARTIFACT_MAX_BYTES + 1))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(createArtifact).not.toHaveBeenCalled()
    expect(toastError.mock.calls[0][0]).toContain('file_too_large')
  })

  it('tải lên hỏng thì báo lỗi và KHÔNG gọi publish', async () => {
    createArtifact.mockRejectedValue(new Error('mạng hỏng'))
    render(<ArtifactQuickPublish />)
    drop(fileOf('a.html'))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(publishArtifact).not.toHaveBeenCalled()
  })

  it('tải lên xong mà publish hỏng thì nói rõ file đang ở trạng thái nháp', async () => {
    publishArtifact.mockRejectedValue(new Error('slug trùng'))
    render(<ArtifactQuickPublish />)
    drop(fileOf('a.html'))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    // Người dùng phải biết file còn đó, nếu không họ tải lên lần nữa và sinh bản trùng.
    expect(toastError.mock.calls[0][0]).toContain('publish_failed_draft')
    expect(screen.queryByTestId('created-dialog')).toBeNull()
  })

  it('publish trả về không có link thì báo thành công nhưng không mở hộp thoại', async () => {
    publishArtifact.mockResolvedValue({ short_url: null })
    render(<ArtifactQuickPublish />)
    drop(fileOf('a.html'))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    expect(screen.queryByTestId('created-dialog')).toBeNull()
  })

  it('mỗi lần thả sinh một slug khác nhau', async () => {
    render(<ArtifactQuickPublish />)
    drop(fileOf('a.html'))
    await waitFor(() => expect(publishArtifact).toHaveBeenCalledTimes(1))
    drop(fileOf('b.html'))
    await waitFor(() => expect(publishArtifact).toHaveBeenCalledTimes(2))
    expect(publishArtifact.mock.calls[0][0].slug).not.toBe(publishArtifact.mock.calls[1][0].slug)
  })
})
