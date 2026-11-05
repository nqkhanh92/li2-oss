import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { ARTIFACT_ACCESS_MODES } from '@/core/types/artifact.type'
import { ArtifactCreate } from '@/features/artifacts/components/artifact-create'

/**
 * Bố cục 3 cột của trang tạo artifact (mockup `Li2UI/10-trang-tao-artifact.html`).
 *
 * Test đáng giá nhất ở đây là cái ở `describe` thứ hai: chế độ `public` PHẢI nói ra là người tạo
 * sẽ không biết ai đã mở. Đo trên LiHi 28/32 artifact đang ở `public`, và ô vàng đó là chỗ duy nhất
 * trong luồng tạo nói cho họ biết đánh đổi là gì — nó mất đi mà không ai thấy là hoàn toàn có thể.
 *
 * `describe` cuối ghim payload: cả việc này là sắp xếp lại giao diện, nên hai request đi ra phải y
 * như trước khi sắp xếp.
 */

const checkSlug = vi.fn()
const createArtifact = vi.fn()
const publishArtifact = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({ org_id: 'org-1' }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
vi.mock('@/features/touch-points/hooks/use-slug-validation', () => ({
  useSlugValidation: () => ({ mutateAsync: checkSlug, isPending: false }),
}))
vi.mock('@/features/artifacts/hooks/use-artifacts', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return {
    ...actual,
    useCreateArtifact: () => ({ mutateAsync: createArtifact, isPending: false }),
    usePublishArtifact: () => ({ mutateAsync: publishArtifact, isPending: false }),
    // Cả bốn chế độ: test này đo cột phải cho từng chế độ, nên chế độ nào cũng phải chọn được.
    useArtifactAccessModes: () => ({ data: { modes: [...ARTIFACT_ACCESS_MODES] } }),
    useArtifactQuota: () => ({ data: undefined }),
  }
})
vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({ organization: { id: 'org-1', name: 'Org Một' } }),
}))
vi.mock('@/shared/components/layout/content-layout', () => ({
  ContentLayout: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
}))
vi.mock('@/features/artifacts/components/artifact-created-dialog', () => ({
  ArtifactCreatedDialog: ({ shortUrl }: { shortUrl: string }) => (
    <div data-testid="created-dialog">{shortUrl}</div>
  ),
}))

const selectMode = (mode: (typeof ARTIFACT_ACCESS_MODES)[number]) => {
  fireEvent.click(screen.getByTestId('artifact-section-access'))
  const index = ARTIFACT_ACCESS_MODES.indexOf(mode)
  fireEvent.click(screen.getAllByRole('radio')[index])
}

const pickFile = (container: HTMLElement) => {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['<p>xin chào</p>'], 'bao-gia.html', { type: 'text/html' })
  fireEvent.change(input, { target: { files: [file] } })
  return file
}

beforeEach(() => {
  vi.clearAllMocks()
  checkSlug.mockResolvedValue({ exists: false })
})

describe('ArtifactCreate — ba cột', () => {
  it('mở ra là thấy cả ba cột: điều hướng, ô thả file, khối người xem', () => {
    const { container } = render(<ArtifactCreate />)
    expect(screen.getByTestId('artifact-section-basic')).toBeTruthy()
    expect(container.querySelector('input[type="file"]')).toBeTruthy()
    expect(screen.getByTestId('viewer-outcome')).toBeTruthy()
  })

  it('bốn mục "Chỉ có ở Short link" hiện ra nhưng không bấm được', () => {
    render(<ArtifactCreate />)
    const locked = ['smart_targeting', 'utm_builder', 'link_expiration', 'click_limitation'].map(
      (key) => screen.getByTestId(`artifact-section-locked-${key}`) as HTMLButtonElement
    )

    expect(locked).toHaveLength(4)
    for (const item of locked) expect(item.disabled).toBe(true)
  })

  it('bấm "Ai được xem" ở cột trái thì cột giữa đổi nội dung', () => {
    const { container } = render(<ArtifactCreate />)
    expect(container.querySelector('input[type="file"]')).toBeTruthy()

    fireEvent.click(screen.getByTestId('artifact-section-access'))
    // Ô thả file đi khỏi cột giữa, bộ chọn chế độ vào thay.
    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(screen.getByText('artifact:create.access_lead')).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(ARTIFACT_ACCESS_MODES.length)

    fireEvent.click(screen.getByTestId('artifact-section-basic'))
    expect(container.querySelector('input[type="file"]')).toBeTruthy()
    expect(screen.queryByText('artifact:create.access_lead')).toBeNull()
  })

  it('mục Thẻ nói thật là artifact chưa gắn thẻ được, không dựng ô chọn thẻ giả', () => {
    render(<ArtifactCreate />)
    fireEvent.click(screen.getByTestId('artifact-section-tags'))
    expect(screen.getByText('artifact:create.tags.unavailable')).toBeTruthy()
  })
})

describe('ArtifactCreate — cột phải đổi theo chế độ đang chọn', () => {
  it('công khai: "mở ngay", và CẢNH BÁO là sẽ không biết ai đã mở', () => {
    render(<ArtifactCreate />)
    // `public` là mặc định, nên cảnh báo phải có mặt ngay khi mở trang.
    expect(screen.getByTestId('viewer-outcome').getAttribute('data-mode')).toBe('public')
    expect(screen.getByText('artifact:create.viewer.public.headline')).toBeTruthy()
    expect(screen.getByTestId('viewer-outcome-warning')).toBeTruthy()
    expect(screen.getByText('artifact:create.viewer.public.warning')).toBeTruthy()
  })

  it('mật khẩu: người xem gặp ô nhập mật khẩu, và không còn cảnh báo', () => {
    render(<ArtifactCreate />)
    selectMode('password')
    expect(screen.getByTestId('viewer-outcome').getAttribute('data-mode')).toBe('password')
    expect(screen.getByText('artifact:create.viewer.password.headline')).toBeTruthy()
    expect(screen.queryByTestId('viewer-outcome-warning')).toBeNull()
  })

  it('đăng nhập Google: nói rõ email được ghi vào Khách hàng', () => {
    render(<ArtifactCreate />)
    selectMode('google')
    expect(screen.getByTestId('viewer-outcome').getAttribute('data-mode')).toBe('google')
    expect(screen.getByText('artifact:create.viewer.google.headline')).toBeTruthy()
    expect(screen.getByText('artifact:create.viewer.google.body')).toBeTruthy()
    expect(screen.queryByTestId('viewer-outcome-warning')).toBeNull()
  })

  it('riêng tư: người ngoài tổ chức thấy trang xin đăng nhập', () => {
    render(<ArtifactCreate />)
    selectMode('private')
    expect(screen.getByTestId('viewer-outcome').getAttribute('data-mode')).toBe('private')
    expect(screen.getByText('artifact:create.viewer.private.headline')).toBeTruthy()
    expect(screen.queryByTestId('viewer-outcome-warning')).toBeNull()
  })

  it('cảnh báo đi theo chế độ, không dính lại sau khi đổi qua rồi đổi về', () => {
    render(<ArtifactCreate />)
    selectMode('private')
    expect(screen.queryByTestId('viewer-outcome-warning')).toBeNull()
    selectMode('public')
    expect(screen.getByTestId('viewer-outcome-warning')).toBeTruthy()
  })
})

describe('ArtifactCreate — giao diện đổi, hành vi không đổi', () => {
  it('vẫn gọi đúng hai request với đúng payload như trước', async () => {
    createArtifact.mockResolvedValue({ id: 'artifact-1' })
    publishArtifact.mockResolvedValue({ id: 'artifact-1', short_url: 'https://lihi.test/abc123' })

    const { container } = render(<ArtifactCreate />)
    const file = pickFile(container)
    const slug = (screen.getByLabelText(/create.slug.label/) as HTMLInputElement).value

    fireEvent.click(screen.getByText('artifact:create.submit'))

    await waitFor(() => expect(createArtifact).toHaveBeenCalledTimes(1))
    expect(createArtifact.mock.calls[0][0]).toMatchObject({
      file,
      name: 'bao-gia',
      onUploadProgress: expect.any(Function),
    })

    await waitFor(() => expect(publishArtifact).toHaveBeenCalledTimes(1))
    expect(publishArtifact.mock.calls[0][0]).toEqual({
      artifact_id: 'artifact-1',
      slug,
      access_mode: 'public',
      password: undefined,
    })

    await waitFor(() => expect(screen.getByTestId('created-dialog')).toBeTruthy())
  })

  it('chọn mật khẩu ở mục riêng thì mật khẩu vẫn đi kèm payload publish', async () => {
    createArtifact.mockResolvedValue({ id: 'artifact-2' })
    publishArtifact.mockResolvedValue({ id: 'artifact-2', short_url: 'https://lihi.test/def456' })

    const { container } = render(<ArtifactCreate />)
    pickFile(container)
    selectMode('password')
    fireEvent.change(screen.getByLabelText('artifact:access.password_label'), {
      target: { value: 'matkhaudu' },
    })

    fireEvent.click(screen.getByText('artifact:create.submit'))

    await waitFor(() => expect(publishArtifact).toHaveBeenCalledTimes(1))
    expect(publishArtifact.mock.calls[0][0]).toMatchObject({
      artifact_id: 'artifact-2',
      access_mode: 'password',
      password: 'matkhaudu',
    })
  })
})
