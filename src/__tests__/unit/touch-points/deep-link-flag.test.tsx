import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Cờ `NEXT_PUBLIC_DISABLE_DEEP_LINK_ANALYTICS` phải thắng gói thuê bao.
 *
 * Trước đây cờ chỉ được đọc ở `menu-list.tsx`, nên bật nó chỉ ẩn mục sidebar: menu hành động trong
 * danh sách short link (`short-link-list/index.tsx`), trang chi tiết touch point và các thẻ
 * custom-domain đều gate theo `enableDeepLinkAttribution` — tức theo gói — nên với org gói Pro
 * chúng vẫn hiện, bấm vào là ra đúng trang vừa ẩn. Đo trên LiHi: 2/4 user có gói bật
 * (t1 PREMIUM, t2 ENTERPRISE), nên đây không phải trường hợp giả định.
 */

const PRO_PLAN = { advanced_features_allowed: ['deep_link_attribution'] }

async function loadHook(disableFlag: string | undefined, orgPlan: unknown) {
  vi.stubEnv('NEXT_PUBLIC_DISABLE_DEEP_LINK_ANALYTICS', disableFlag ?? '')
  vi.resetModules()

  vi.doMock('@/shared/providers/organization-store-provider', () => ({
    useOrganizationStoreProvider: () => ({ orgPlan }),
  }))

  const { usePlanFeatures } = await import('@/features/touch-points/hooks/use-plan-features')
  return usePlanFeatures
}

/** Gọi hook ngoài React: nó chỉ dùng useMemo/useCallback nên chạy được với một renderer tối giản. */
async function readFlag(disableFlag: string | undefined, orgPlan: unknown) {
  const usePlanFeatures = await loadHook(disableFlag, orgPlan)
  const { renderHook } = await import('@testing-library/react')
  const { result } = renderHook(() => usePlanFeatures())
  return result.current.enableDeepLinkAttribution
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.doUnmock('@/shared/providers/organization-store-provider')
})

describe('enableDeepLinkAttribution vs cờ tắt', () => {
  it('gói Pro mà KHÔNG bật cờ thì vẫn cho dùng', async () => {
    expect(await readFlag(undefined, PRO_PLAN)).toBe(true)
  })

  it('gói Pro nhưng bật cờ thì tắt — cờ thắng gói', async () => {
    expect(await readFlag('true', PRO_PLAN)).toBe(false)
  })

  it('gói thường thì tắt dù không bật cờ', async () => {
    expect(await readFlag(undefined, { advanced_features_allowed: [] })).toBe(false)
  })

  it('không có gói thì trả false chứ không ném', async () => {
    expect(await readFlag(undefined, null)).toBe(false)
    expect(await readFlag('true', null)).toBe(false)
  })
})
