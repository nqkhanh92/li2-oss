import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadOrgHomePath(section?: string) {
  vi.stubEnv('NEXT_PUBLIC_ORG_HOME_SECTION', section ?? '')
  vi.resetModules()
  const mod = await import('@/shared/constants')
  return mod.orgHomePath
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('orgHomePath', () => {
  it('mặc định trỏ overview', async () => {
    const orgHomePath = await loadOrgHomePath()
    expect(orgHomePath('org-1')).toBe('/org/org-1/overview')
  })

  it('tôn trọng NEXT_PUBLIC_ORG_HOME_SECTION', async () => {
    const orgHomePath = await loadOrgHomePath('short-links')
    expect(orgHomePath('org-1')).toBe('/org/org-1/short-links')
  })
})
