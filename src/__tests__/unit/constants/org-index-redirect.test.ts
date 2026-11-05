import { afterEach, describe, expect, it, vi } from 'vitest'

const redirect = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}))

async function loadPage(section?: string) {
  vi.stubEnv('NEXT_PUBLIC_ORG_HOME_SECTION', section ?? '')
  vi.resetModules()
  const mod = await import('@/app/(protected)/org/[org_id]/page')
  return mod.default
}

afterEach(() => {
  redirect.mockReset()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('trang chủ org', () => {
  it('mặc định redirect sang overview', async () => {
    const Page = await loadPage()
    Page({ params: { org_id: 'org-1' } })
    expect(redirect).toHaveBeenCalledWith('/org/org-1/overview')
  })

  it('redirect sang section cấu hình bằng env', async () => {
    const Page = await loadPage('short-links')
    Page({ params: { org_id: 'org-1' } })
    expect(redirect).toHaveBeenCalledWith('/org/org-1/short-links')
  })
})
