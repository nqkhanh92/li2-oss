import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ArtifactCreate } from '@/features/artifacts/components/artifact-create'

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
    useArtifactAccessModes: () => ({ modes: ['public'], isLoading: false }),
  }
})
vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({ organization: { id: 'org-1', org_slug: 'org' } }),
}))
vi.mock('@/shared/components/layout/content-layout', () => ({
  ContentLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const slugInput = () => screen.getByLabelText(/create.slug.label/) as HTMLInputElement
const typeSlug = async (value: string) => {
  fireEvent.change(slugInput(), { target: { value } })
  // Ô kiểm trùng có debounce 500 ms.
  await act(async () => {
    vi.advanceTimersByTime(600)
  })
}

describe('ArtifactCreate — đường dẫn tự sinh và báo trùng', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    checkSlug.mockResolvedValue({ exists: false })
  })

  it('điền sẵn một đường dẫn ngẫu nhiên hợp lệ ngay khi mở trang', () => {
    render(<ArtifactCreate />)
    expect(slugInput().value).toMatch(/^[a-z0-9]{10}$/)
  })

  it('hai lần mở trang cho hai đường dẫn khác nhau', () => {
    const { unmount } = render(<ArtifactCreate />)
    const first = slugInput().value
    unmount()
    render(<ArtifactCreate />)
    expect(slugInput().value).not.toBe(first)
  })

  it('người dùng sửa lại được đường dẫn tự sinh', async () => {
    render(<ArtifactCreate />)
    await typeSlug('bao-cao-quy-ba')
    expect(slugInput().value).toBe('bao-cao-quy-ba')
  })

  it('đường dẫn còn trống thì báo dùng được bằng chữ xanh', async () => {
    render(<ArtifactCreate />)
    await typeSlug('duong-dan-moi')
    await waitFor(() => expect(screen.getByText(/create.slug.available/)).toBeTruthy())
    expect(screen.queryByText(/create.slug.taken/)).toBeNull()
  })

  it('đường dẫn đã có người dùng thì báo đỏ ngay dưới ô', async () => {
    checkSlug.mockResolvedValue({ exists: true })
    render(<ArtifactCreate />)
    await typeSlug('da-co-nguoi-dung')
    await waitFor(() => expect(screen.getByText(/create.slug.taken/)).toBeTruthy())
    expect(screen.queryByText(/create.slug.available/)).toBeNull()
  })

  it('nút sinh lại cho một đường dẫn khác', async () => {
    render(<ArtifactCreate />)
    const before = slugInput().value
    fireEvent.click(screen.getByLabelText(/create.slug.regenerate/))
    expect(slugInput().value).not.toBe(before)
    expect(slugInput().value).toMatch(/^[a-z0-9]{10}$/)
  })

  it('không gọi API kiểm trùng khi đường dẫn sai định dạng', async () => {
    render(<ArtifactCreate />)
    checkSlug.mockClear()
    await typeSlug('ab') // ngắn hơn mức tối thiểu 6
    expect(checkSlug).not.toHaveBeenCalled()
  })

  it('mạng hỏng lúc kiểm thì không kết luận là trùng', async () => {
    checkSlug.mockRejectedValue(new Error('mất mạng'))
    render(<ArtifactCreate />)
    await typeSlug('mang-hong-thi-sao')
    await waitFor(() => expect(checkSlug).toHaveBeenCalled())
    // Để backend nói lời cuối, đừng chặn người dùng vì một lỗi mạng.
    expect(screen.queryByText(/create.slug.taken/)).toBeNull()
  })
})
