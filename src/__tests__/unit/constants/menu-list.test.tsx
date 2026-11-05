import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useParams: () => ({ org_id: 'org-1' }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({ hasPermission: () => true }),
}))

const FLAG_ENVS = [
  'NEXT_PUBLIC_DISABLE_OVERVIEW_GROUP',
  'NEXT_PUBLIC_DISABLE_ONBOARDING',
  'NEXT_PUBLIC_DISABLE_DASHBOARDS',
  'NEXT_PUBLIC_DISABLE_CONVERSIONS',
  'NEXT_PUBLIC_DISABLE_CUSTOMERS',
  'NEXT_PUBLIC_DISABLE_BEHAVIOR_ANALYTICS',
]

type Group = { groupLabel: string; enabled?: boolean; menus: any[] }

async function loadMenu(
  env: Record<string, string> = {},
  pathname = '/org/org-1/short-links'
) {
  for (const key of FLAG_ENVS) vi.stubEnv(key, '')
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  vi.resetModules()
  const { getMenuList } = await import('@/shared/constants/menu-list')
  return getMenuList(pathname) as Group[]
}

const visibleGroups = (groups: Group[]) =>
  groups.filter((g) => g.enabled !== false && g.menus.some((m) => m.enabled !== false))

const visibleHrefs = (groups: Group[]) =>
  visibleGroups(groups)
    .flatMap((g) => g.menus)
    .filter((m) => m.enabled !== false)
    .flatMap((m) => (m.type === 'group' ? (m.children ?? []) : [m]))
    .filter((m: any) => m.enabled !== false)
    .map((m: any) => m.href as string)

beforeEach(() => {
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('getMenuList — flag ẩn module', () => {
  it('mặc định hiện đủ nhóm overview, behavior analytics, conversions, customers', async () => {
    const groups = await loadMenu()
    const labels = visibleGroups(groups).map((g) => g.groupLabel)
    expect(labels).toContain('sidebar.groups.overview')
    expect(labels).toContain('sidebar.groups.behaviorAnalytics')

    const hrefs = visibleHrefs(groups)
    expect(hrefs).toContain('/org/org-1/onboarding')
    expect(hrefs).toContain('/org/org-1/overview')
    expect(hrefs).toContain('/org/org-1/dashboards')
    expect(hrefs).toContain('/org/org-1/conversions')
    expect(hrefs).toContain('/org/org-1/customers')
  })

  it('ẩn cả nhóm overview khi NEXT_PUBLIC_DISABLE_OVERVIEW_GROUP=true', async () => {
    const groups = await loadMenu({ NEXT_PUBLIC_DISABLE_OVERVIEW_GROUP: 'true' })
    const overview = groups.find((g) => g.groupLabel === 'sidebar.groups.overview')
    expect(overview?.enabled).toBe(false)
    expect(visibleGroups(groups).map((g) => g.groupLabel)).not.toContain('sidebar.groups.overview')
    expect(visibleHrefs(groups)).not.toContain('/org/org-1/overview')
  })

  it('ẩn riêng onboarding và dashboards theo flag riêng', async () => {
    const groups = await loadMenu({
      NEXT_PUBLIC_DISABLE_ONBOARDING: 'true',
      NEXT_PUBLIC_DISABLE_DASHBOARDS: 'true',
    })
    const hrefs = visibleHrefs(groups)
    expect(hrefs).not.toContain('/org/org-1/onboarding')
    expect(hrefs).not.toContain('/org/org-1/dashboards')
    expect(hrefs).toContain('/org/org-1/overview')
  })

  it('ẩn cả nhóm behavior analytics khi flag bật', async () => {
    const groups = await loadMenu({ NEXT_PUBLIC_DISABLE_BEHAVIOR_ANALYTICS: 'true' })
    const behavior = groups.find((g) => g.groupLabel === 'sidebar.groups.behaviorAnalytics')
    expect(behavior?.enabled).toBe(false)
    const hrefs = visibleHrefs(groups)
    for (const path of [
      '/org/org-1/link-journey',
      '/org/org-1/funnels',
      '/org/org-1/site-analytics',
      '/org/org-1/session-recordings',
      '/org/org-1/event-rules',
    ]) {
      expect(hrefs).not.toContain(path)
    }
  })

  it('Link và Artifact là MỘT mục, không còn mục Artifact riêng', async () => {
    // Chủ sản phẩm chốt 2026-10-27: gộp thành một mục. Test cũ ở đây chốt "Artifact đứng TRƯỚC
    // Short Link" (thứ tự chọn 2026-10-23) — nay không còn thứ tự nào để chốt vì chỉ còn một mục.
    //
    // Lý do gộp: artifact là touch point `content_type = 'ARTIFACT'`, và /short-links LUÔN trả về
    // cả hai. Hai mục sidebar là thứ khiến người dùng tưởng đó là hai kho riêng.
    const hrefs = visibleHrefs(await loadMenu())
    expect(hrefs).toContain('/org/org-1/short-links')
    expect(hrefs).not.toContain('/org/org-1/artifacts')
    // Đúng MỘT lần, không phải "có mặt ít nhất một lần" — gộp hụt sẽ để lại hai mục cùng href.
    expect(hrefs.filter((h) => h === '/org/org-1/short-links')).toHaveLength(1)
  })

  it('mục gộp vẫn sáng khi đang ở /artifacts', async () => {
    // Route /artifacts vẫn sống (replace file, publish, link sâu). Mở nó bằng link trực tiếp thì
    // mục "Link & Artifact" phải sáng, không thì sidebar trông như người dùng ở ngoài mọi mục.
    const groups = await loadMenu({}, '/org/org-1/artifacts')
    const item = groups
      .flatMap((g: any) => g.menus)
      .find((m: any) => m.href === '/org/org-1/short-links')
    expect(item?.active).toBe(true)
  })

  it('ẩn conversions và customers theo flag, giữ các mục còn lại', async () => {
    const groups = await loadMenu({
      NEXT_PUBLIC_DISABLE_CONVERSIONS: 'true',
      NEXT_PUBLIC_DISABLE_CUSTOMERS: 'true',
    })
    const hrefs = visibleHrefs(groups)
    expect(hrefs).not.toContain('/org/org-1/conversions')
    expect(hrefs).not.toContain('/org/org-1/customers')
    for (const path of [
      // `/artifacts` đã bỏ khỏi menu 2026-10-27 (gộp vào `/short-links`), nên không còn ở đây.
      '/org/org-1/short-links',
      '/org/org-1/analytics',
      '/org/org-1/custom-domains',
    ]) {
      expect(hrefs).toContain(path)
    }
  })

  it('không còn mục Realtime riêng — đã gom vào Analytics', async () => {
    // Route /org/<id>/realtime vẫn sống cho link cũ; chỉ mục menu bị bỏ.
    expect(visibleHrefs(await loadMenu())).not.toContain('/org/org-1/realtime')
  })

  it('không còn Spaces và Tags trong sidebar chính', async () => {
    // 2026-10-23: Spaces ẩn toàn bộ; Tags chuyển vào sidebar của form tạo short link, dưới
    // Link Cloaking. Cả hai route vẫn sống, chỉ mục menu bị bỏ.
    const hrefs = visibleHrefs(await loadMenu())
    expect(hrefs).not.toContain('/org/org-1/spaces')
    expect(hrefs).not.toContain('/org/org-1/tags')
  })

  it('bỏ luôn nhóm ORGANIZE vì không còn mục nào', async () => {
    // Nhóm rỗng để lại thì sidebar còn một tiêu đề không có gì bên dưới.
    const labels = (await loadMenu()).flatMap((g) =>
      g.menus.filter((m: any) => m.type === 'group').map((m: any) => m.label)
    )
    expect(labels).not.toContain('sidebar.groups.organize')
  })
})
