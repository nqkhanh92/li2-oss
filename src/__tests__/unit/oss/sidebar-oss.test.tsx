import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tiêu chí nghiệm thu BẰNG HÌNH của đợt tách OSS, viết thành phép kiểm máy chạy được.
 *
 * Chủ sản phẩm đưa một ảnh dashboard Li2.ai và chốt: bản OSS phải có **cùng sidebar**, chỉ được
 * mất những mục đã liệt kê. Ảnh đó có 6 mục dưới hai nhóm:
 *
 *     OVERVIEW          Overview
 *     LINK MANAGEMENT   Custom Domain · Links & Artifacts · Analytics ·
 *                       Deep Links 👑 Beta · Customers 👑
 *
 * Quyết định: mất **Deep Links** (mã sang `src/ee/`). **Customers Ở LẠI** — chủ sản phẩm chốt
 * 2026-11-05, dù nó có vương miện trong ảnh.
 *
 * ## Vì sao cần test này chứ không chỉ nhìn một lần
 *
 * Trong chính đợt này tôi đã báo "giao diện xong" ba lần dựa trên *CSS có nạp*, *class có trong
 * bundle*, *HTTP 200* — và vẫn sai, vì chưa lần nào nhìn màn hình. Nhìn một lần thì sửa được lần
 * đó; test thì chặn được lần sau. Một `isCloud` đặt nhầm chỗ ở PR tương lai sẽ làm đỏ ở đây.
 *
 * ⚠ Test này kiểm **danh sách mục menu**, không kiểm màu sắc, khoảng cách hay bố cục. Phần đó
 * vẫn phải người nhìn.
 */

const ORG_ID = 'org-test'

// `getMenuList` là hook: dùng useParams + useTranslation + store tổ chức.
vi.mock('next/navigation', () => ({ useParams: () => ({ org_id: ORG_ID }) }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))
vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({ hasPermission: () => true }),
}))

/**
 * 21 cờ vận hành. Test TỰ ĐẶT tất cả về 'false'.
 *
 * ⚠ Không làm vậy thì test đạt vì lý do sai: `.env.local` của máy này trỏ LiHi staging, nơi
 * `NEXT_PUBLIC_DISABLE_CUSTOMERS` và cả nhóm BEHAVIOR_ANALYTICS đang BẬT. Phép so OSS↔cloud khi
 * đó xanh chỉ vì hai bên cùng tắt sẵn một đống mục — nó không kiểm `EDITION` lần nào. Đã mắc
 * đúng bẫy này một lần ở bộ e2e của bản viết lại; lần này chặn trước.
 */
const OPERATIONAL_FLAGS = [
  'AI_CHAT', 'ATTRIBUTION', 'BEHAVIOR_ANALYTICS', 'CAMPAIGNS', 'CONVERSIONS', 'CUSTOMERS',
  'DASHBOARDS', 'DEEP_LINK_ANALYTICS', 'DEVELOPER_SETTINGS', 'FACEBOOK_TRACKING',
  'FORM_ANALYTICS', 'GA_TRACKING', 'HEATMAP', 'INTEGRATIONS', 'LINK_JOURNEY', 'ONBOARDING',
  'OVERVIEW_GROUP', 'ROADMAP', 'SESSION_RECORDING', 'SUPPORT_CHAT', 'TIKTOK_TRACKING',
]

/** Nhãn của mọi mục đang BẬT, phẳng hoá qua các nhóm. Chỉ `EDITION` được phép thay đổi. */
async function enabledLabels(edition: 'oss' | 'cloud'): Promise<string[]> {
  vi.resetModules()
  for (const f of OPERATIONAL_FLAGS) process.env[`NEXT_PUBLIC_DISABLE_${f}`] = 'false'
  process.env.NEXT_PUBLIC_EDITION = edition
  const { getMenuList } = await import('@/shared/constants/menu-list')
  return getMenuList('/org/' + ORG_ID + '/overview')
    // ⚠ Phải lọc cả cờ cấp NHÓM. Bỏ nó thì một gate đặt ở `Group.enabled` — như nhóm
    // HÀNH VI TƯƠNG TÁC — hoàn toàn vô hình với test, và test xanh dù sidebar sai.
    .filter((g) => g.enabled !== false)
    .flatMap((g) => g.menus)
    .filter((m) => m.enabled !== false)
    .map((m) => m.label ?? '')
}

/** Nhãn của mọi mục đang BẬT và có vương miện 👑. */
async function premiumLabels(edition: 'oss' | 'cloud'): Promise<string[]> {
  vi.resetModules()
  for (const f of OPERATIONAL_FLAGS) process.env[`NEXT_PUBLIC_DISABLE_${f}`] = 'false'
  process.env.NEXT_PUBLIC_EDITION = edition
  const { getMenuList } = await import('@/shared/constants/menu-list')
  return getMenuList('/org/' + ORG_ID + '/overview')
    // ⚠ Phải lọc cả cờ cấp NHÓM. Bỏ nó thì một gate đặt ở `Group.enabled` — như nhóm
    // HÀNH VI TƯƠNG TÁC — hoàn toàn vô hình với test, và test xanh dù sidebar sai.
    .filter((g) => g.enabled !== false)
    .flatMap((g) => g.menus)
    .filter((m) => m.enabled !== false && m.isPremium)
    .map((m) => m.label ?? '')
}

describe('sidebar bản OSS — tiêu chí nghiệm thu bằng hình', () => {
  const original = process.env.NEXT_PUBLIC_EDITION
  beforeEach(() => {
    process.env.NEXT_PUBLIC_EDITION = original
  })

  it('bản OSS KHÔNG có mục Deep Links', async () => {
    const labels = await enabledLabels('oss')
    expect(labels, 'Deep Links phải biến mất khi EDITION=oss').not.toContain('sidebar.deepLinks')
  })

  it('bản OSS KHÔNG có Dashboards và Conversions — PR #7', async () => {
    const labels = await enabledLabels('oss')
    // Dashboards: quyết định #2 — bản OSS giữ Overview thay cho nó.
    // Conversions: đi theo attribution, quyết định #3.
    expect(labels).not.toContain('sidebar.dashboards')
    expect(labels).not.toContain('sidebar.conversions')
  })

  it('bản OSS KHÔNG có cả nhóm HÀNH VI TƯƠNG TÁC', async () => {
    // Chủ sản phẩm chốt 2026-11-05: năm tính năng này không phát triển tiếp, bản OSS không mang.
    const labels = await enabledLabels('oss')
    for (const key of [
      'sidebar.linkJourney',
      'sidebar.funnels',
      'sidebar.siteAnalytics',
      'sidebar.sessionRecordings',
      'sidebar.eventRules',
    ]) {
      expect(labels, `${key} phải biến mất khi EDITION=oss`).not.toContain(key)
    }
    // Và bản cloud vẫn phải có đủ — gate không được rò sang bản thương mại.
    expect(await enabledLabels('cloud')).toContain('sidebar.funnels')
  })

  it('bản OSS KHÔNG có Get Started', async () => {
    // Hai thẻ của trang đó giới thiệu Heatmaps, Funnels, Session Replay, Conversion Tracking,
    // Link Journey — bản OSS không có cái nào. Chủ sản phẩm chốt 2026-11-05.
    expect(await enabledLabels('oss')).not.toContain('sidebar.onboarding')
    expect(await enabledLabels('cloud')).toContain('sidebar.onboarding')
  })

  it('bản OSS KHÔNG còn vương miện 👑 nào — không có bậc gói để nâng cấp lên', async () => {
    const crowned = await premiumLabels('oss')
    expect(crowned, 'isPremium phải tắt hết khi EDITION=oss').toEqual([])
    expect(await premiumLabels('cloud')).not.toEqual([])
  })

  it('bản cloud VẪN có mục Deep Links — gate không được rò sang bản thương mại', async () => {
    const labels = await enabledLabels('cloud')
    expect(labels).toContain('sidebar.deepLinks')
  })

  it('bản OSS GIỮ bốn mục lõi trong ảnh nghiệm thu', async () => {
    const labels = await enabledLabels('oss')
    // Bốn mục này là xương sống của sản phẩm mở; mất bất kỳ cái nào là lệch ảnh.
    for (const key of ['sidebar.overview', 'sidebar.domain', 'sidebar.linkAndArtifact', 'sidebar.analytics']) {
      expect(labels, `thiếu ${key} ở bản OSS`).toContain(key)
    }
  })

  it('bản OSS GIỮ Customers — chủ sản phẩm chốt, dù ảnh có vương miện', async () => {
    const labels = await enabledLabels('oss')
    expect(labels).toContain('sidebar.customers')
  })

  it('OSS và cloud chỉ lệch ĐÚNG những mục đã duyệt', async () => {
    const oss = new Set(await enabledLabels('oss'))
    const cloud = await enabledLabels('cloud')
    const missing = cloud.filter((l) => !oss.has(l))

    // Danh sách này là hợp đồng. Thêm một mục vào đây nghĩa là bản OSS mất thêm một tính năng —
    // phải được chủ sản phẩm duyệt, không phải hệ quả tình cờ của một PR.
    expect(
      missing.sort(),
      `Bản OSS mất ${missing.length} mục so với cloud. Nếu đây là chủ ý thì cập nhật danh sách ` +
        'này VÀ docs/oss-split/01-kiem-ke.md; nếu không thì một gate đã đặt nhầm chỗ.'
    ).toEqual([
      'sidebar.conversions',
      'sidebar.dashboards',
      'sidebar.deepLinks',
      'sidebar.eventRules',
      'sidebar.funnels',
      'sidebar.linkJourney',
      'sidebar.onboarding',
      'sidebar.sessionRecordings',
      'sidebar.siteAnalytics',
    ])
  })
})
