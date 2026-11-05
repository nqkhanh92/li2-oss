import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// ── Heavy library mocks (prevent OOM from lucide-react's 1200+ icon bundle) ──

vi.mock('lucide-react', () => ({
  CheckCircle2: () => React.createElement('span', { 'data-testid': 'icon-check' }),
  XCircle: () => React.createElement('span', { 'data-testid': 'icon-x' }),
  Loader2: () => React.createElement('span', { 'data-testid': 'icon-loader', className: 'animate-spin' }),
  Pencil: () => React.createElement('span', { 'data-testid': 'icon-pencil' }),
}))

vi.mock('@/shared/components/ui/form', () => ({
  Form: ({ children }: any) => React.createElement('div', null, children),
  FormField: ({ render: renderFn, control, name }: any) =>
    renderFn({ field: { value: '', onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn(), name } }),
  FormControl: ({ children }: any) => React.createElement('div', null, children),
  FormItem: ({ children, className }: any) => React.createElement('div', { className }, children),
  FormLabel: ({ children, className }: any) => React.createElement('label', { className }, children),
  FormMessage: () => null,
}))

vi.mock('@/shared/components/ui/input', () => {
  const Input = React.forwardRef(({ className, ...props }: any, ref: any) =>
    React.createElement('input', { ref, className, ...props })
  )
  Input.displayName = 'Input'
  return { Input }
})

vi.mock('@/shared/components/customize/loading-button', () => ({
  LoadingButton: ({ children, isLoading, ...props }: any) =>
    React.createElement('button', props, isLoading ? 'Loading...' : children),
}))

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => React.createElement('img', { alt }),
}))

const mockReset = vi.fn()
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => (e: any) => { e?.preventDefault?.(); fn({ name: 'Test Org', org_slug: 'test-org' }) },
    watch: (field?: string) => field === 'org_slug' ? 'test-org' : undefined,
    getValues: () => 'test-org',
    reset: mockReset,
    setValue: vi.fn(),
    formState: { errors: {} },
  }),
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => () => ({ values: {}, errors: {} }),
}))

vi.mock('@/shared/schemas/organizations', () => ({
  organizationFormSchema: {},
  orgSlugSchema: {},
}))

// ── App-level mocks ──────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockMutate = vi.fn()
vi.mock('@/features/organizations/hooks/mutations/mutations', () => ({
  useCreateOrganization: () => ({ mutate: mockMutate, isPending: false }),
}))

vi.mock('@/shared/stores/profile-store', () => ({
  authStore: () => ({ profile: { email: 'john@example.com', name: 'John' } }),
}))

vi.mock('@/app/actions/organization', () => ({
  checkSlugAvailability: (...args: unknown[]) => mockCheckSlug(...args),
}))

const mockIsPlanGateError = vi.fn().mockReturnValue(false)
vi.mock('@/shared/lib/axios', () => ({
  isPlanGateError: (...args: unknown[]) => mockIsPlanGateError(...args),
}))

const mockToast = vi.fn()
vi.mock('@/shared/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}))

// QQuik main mock `@/shared/constants/disabled-features` một lần nữa ở đây (`mockDisabledFeatures`)
// và mock cả `@/shared/constants` cho `orgHomePath`. Cả hai đã gỡ khi merge v5:
//   - Hai `vi.mock` cùng một module thì lần ĐĂNG KÝ SAU thắng, nên bản của main lặng lẽ vô tác
//     dụng và test của nó đọc cờ không bao giờ đổi — merge sạch, test đỏ. Nay dùng `homeFlags`
//     bên dưới, là mock duy nhất cho module này.
//   - `orgHomePath` không còn được `create-form.tsx` import sau khi giải xung đột (xem comment
//     trong chính file đó), và mock thay cả module `@/shared/constants` bằng một hàm duy nhất
//     sẽ làm hỏng mọi import khác từ module ấy.

const mockSlugStatus = { current: 'available' as string }
const mockHandleSlugChange = vi.fn()
const mockCheckSlugHook = vi.fn()
vi.mock('@/features/organizations/hooks/use-organization-slug', () => ({
  useOrganizationSlug: () => ({
    slugStatus: mockSlugStatus.current,
    handleSlugChange: mockHandleSlugChange,
    checkSlug: mockCheckSlugHook,
    isManualSlug: false,
    setIsManualSlug: vi.fn(),
  }),
  generateSlug: (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
}))

// ── Hoisted helpers (referenced in mocks above) ──────────────────────────────

// Flag ẩn module đọc từ env — cố định trong test để không phụ thuộc .env.local
const homeFlags = { ORG_HOME_SECTION: '', ONBOARDING: false }

vi.mock('@/shared/constants/disabled-features', () => ({
  get ORG_HOME_SECTION() {
    return homeFlags.ORG_HOME_SECTION
  },
  get disabledFeatures() {
    return { ONBOARDING: homeFlags.ONBOARDING }
  },
}))

const mockPush = vi.fn()
const mockWindowReplace = vi.fn()
const mockCheckSlug = vi.fn().mockResolvedValue({ available: true })

// ── Import component after all mocks are set up ──────────────────────────────

import { CreateOrganizationForm } from '@/features/organizations/components/forms/create-form'

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderForm() {
  return render(React.createElement(CreateOrganizationForm))
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CreateOrganizationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    homeFlags.ORG_HOME_SECTION = ''
    homeFlags.ONBOARDING = false
    mockSlugStatus.current = 'available'
    mockCheckSlug.mockResolvedValue({ available: true })
    mockIsPlanGateError.mockReturnValue(false)
    Object.defineProperty(window, 'location', {
      value: { replace: mockWindowReplace, origin: 'http://localhost' },
      writable: true,
      configurable: true,
    })
  })

  describe('initial render', () => {
    it('renders the org URL label', () => {
      renderForm()
      expect(screen.getByText(/create\.org_url_label/)).toBeDefined()
    })

    it('renders the submit button', () => {
      renderForm()
      expect(screen.getByRole('button', { name: /create\.button/i })).toBeDefined()
    })

    it('pre-fills name and slug from profile email on mount', async () => {
      renderForm()
      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith(
          expect.objectContaining({
            name: expect.stringMatching(/john/i),
            org_slug: expect.stringMatching(/john/i),
          })
        )
      })
    })

    it('displays slug as plain text (no input) by default', () => {
      renderForm()
      const inputs = screen.queryAllByRole('textbox')
      // Only the org name input is visible; slug is in display mode
      expect(inputs.length).toBe(1)
    })

    it('shows pencil icon in slug display mode', () => {
      renderForm()
      expect(screen.getByTestId('icon-pencil')).toBeDefined()
    })
  })

  describe('slug edit mode toggle', () => {
    function getSlugDisplayButton() {
      return screen.getAllByRole('button').find(
        (btn) => btn.getAttribute('type') === 'button' && !btn.textContent?.match(/create\.button/)
      )
    }

    it('switches to input when slug display is clicked', () => {
      renderForm()
      const btn = getSlugDisplayButton()!
      act(() => { fireEvent.click(btn) })
      expect(screen.queryAllByRole('textbox').length).toBe(2)
    })

    it('returns to display mode on slug input blur', () => {
      renderForm()
      const btn = getSlugDisplayButton()!
      act(() => { fireEvent.click(btn) })
      const slugInput = screen.queryAllByRole('textbox')[1]
      act(() => { fireEvent.blur(slugInput) })
      expect(screen.queryAllByRole('textbox').length).toBe(1)
    })

    it('calls handleSlugChange when typing in slug input', () => {
      renderForm()
      act(() => { fireEvent.click(getSlugDisplayButton()!) })
      const slugInput = screen.queryAllByRole('textbox')[1]
      act(() => { fireEvent.change(slugInput, { target: { value: 'new-slug' } }) })
      expect(mockHandleSlugChange).toHaveBeenCalledWith('new-slug')
    })
  })

  describe('validation hints', () => {
    it('shows length hint', () => {
      renderForm()
      expect(screen.getByText('create.hint_length')).toBeDefined()
    })

    it('shows format hint', () => {
      renderForm()
      expect(screen.getByText('create.hint_format')).toBeDefined()
    })

    it('shows "available" text when slug is available', () => {
      mockSlugStatus.current = 'available'
      renderForm()
      expect(screen.getByText('create.hint_available')).toBeDefined()
    })

    it('shows "not available" text when slug is taken', () => {
      mockSlugStatus.current = 'unavailable'
      renderForm()
      expect(screen.getByText('create.hint_unavailable')).toBeDefined()
    })

    it('shows loader icon when slug status is checking', () => {
      mockSlugStatus.current = 'checking'
      renderForm()
      expect(screen.getByTestId('icon-loader')).toBeDefined()
    })
  })

  describe('form submission', () => {
    it('submit button is disabled when slug is unavailable', () => {
      mockSlugStatus.current = 'unavailable'
      renderForm()
      const submit = screen.getByRole('button', { name: /create\.button/i })
      expect(submit.hasAttribute('disabled')).toBe(true)
    })

    it('submit button is enabled when slug is available', () => {
      mockSlugStatus.current = 'available'
      renderForm()
      const submit = screen.getByRole('button', { name: /create\.button/i })
      expect(submit.hasAttribute('disabled')).toBe(false)
    })

    it('calls mutate with name and org_slug on submit', async () => {
      mockSlugStatus.current = 'available'
      renderForm()

      act(() => { fireEvent.submit(document.querySelector('form')!) })

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({ name: expect.any(String), org_slug: expect.any(String) }),
          expect.any(Object)
        )
      })
    })

    it('does not call mutate when slug is unavailable', async () => {
      mockSlugStatus.current = 'unavailable'
      renderForm()
      act(() => { fireEvent.submit(document.querySelector('form')!) })
      await waitFor(() => expect(mockMutate).not.toHaveBeenCalled())
    })

    it('redirects to onboarding on success', async () => {
      mockSlugStatus.current = 'available'
      mockMutate.mockImplementation((_: unknown, { onSuccess }: any) => {
        onSuccess({ organization: { id: 'org-1', org_slug: 'my-org' } })
      })

      renderForm()
      act(() => { fireEvent.submit(document.querySelector('form')!) })

      await waitFor(() => {
        expect(mockWindowReplace).toHaveBeenCalledWith('/org/my-org/onboarding')
      })
    })

    it('redirects to the org home when onboarding is disabled', async () => {
      homeFlags.ONBOARDING = true
      mockSlugStatus.current = 'available'
      mockMutate.mockImplementation((_: unknown, { onSuccess }: any) => {
        onSuccess({ organization: { id: 'org-1', org_slug: 'my-org' } })
      })

      renderForm()
      act(() => { fireEvent.submit(document.querySelector('form')!) })

      await waitFor(() => {
        expect(mockWindowReplace).toHaveBeenCalledWith('/org/my-org/overview')
      })
    })

    it('falls back to org id in redirect when no slug in response', async () => {
      mockSlugStatus.current = 'available'
      mockMutate.mockImplementation((_: unknown, { onSuccess }: any) => {
        onSuccess({ organization: { id: 'org-1', org_slug: null } })
      })

      renderForm()
      act(() => { fireEvent.submit(document.querySelector('form')!) })

      await waitFor(() => {
        expect(mockWindowReplace).toHaveBeenCalledWith('/org/org-1/onboarding')
      })
    })

    it('redirects to configured home section when NEXT_PUBLIC_ORG_HOME_SECTION is set', async () => {
      homeFlags.ORG_HOME_SECTION = 'short-links'
      mockSlugStatus.current = 'available'
      mockMutate.mockImplementation((_: unknown, { onSuccess }: any) => {
        onSuccess({ organization: { id: 'org-1', org_slug: 'my-org' } })
      })

      renderForm()
      act(() => { fireEvent.submit(document.querySelector('form')!) })

      await waitFor(() => {
        expect(mockWindowReplace).toHaveBeenCalledWith('/org/my-org/short-links')
      })
    })

    it('redirects to overview when onboarding is disabled', async () => {
      homeFlags.ONBOARDING = true
      mockSlugStatus.current = 'available'
      mockMutate.mockImplementation((_: unknown, { onSuccess }: any) => {
        onSuccess({ organization: { id: 'org-1', org_slug: 'my-org' } })
      })

      renderForm()
      act(() => { fireEvent.submit(document.querySelector('form')!) })

      await waitFor(() => {
        expect(mockWindowReplace).toHaveBeenCalledWith('/org/my-org/overview')
      })
    })

    it('redirects to /org when plan limit error', async () => {
      mockSlugStatus.current = 'available'
      mockIsPlanGateError.mockReturnValue(true)
      mockMutate.mockImplementation((_: unknown, { onError }: any) => {
        onError(new Error('plan error'))
      })

      renderForm()
      act(() => { fireEvent.submit(document.querySelector('form')!) })

      await waitFor(() => {
        expect(mockWindowReplace).toHaveBeenCalledWith('/org')
      })
      expect(mockToast).not.toHaveBeenCalled()
    })

    it('shows error toast for non-plan errors', async () => {
      mockSlugStatus.current = 'available'
      mockIsPlanGateError.mockReturnValue(false)
      mockMutate.mockImplementation((_: unknown, { onError }: any) => {
        onError(new Error('server error'))
      })

      renderForm()
      act(() => { fireEvent.submit(document.querySelector('form')!) })

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive' })
        )
      })
      expect(mockWindowReplace).not.toHaveBeenCalled()
    })
  })
})
