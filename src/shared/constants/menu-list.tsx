import React from 'react'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ROLE_PERMISSION_KEYS, RolePermissionKey } from '@/shared/types/role-permission'
import {
  Group,
  LucideIcon,
  LayoutDashboard,
  SettingsIcon,
  TagsIcon,
  House,
  Link2,
  ChartArea,
  Dock,
  HousePlug,
  SparklesIcon,
  GlobeIcon,
  Pointer,
  QrCode,
  Tags,
  FolderIcon,
  FileText,
  Megaphone,
  NfcIcon,
  Smartphone,
  SmartphoneNfcIcon,
  TrendingUp,
  Users,
  Funnel,
  MousePointerClick,
  Zap,
  Route,
  Rocket,
  ClipboardList,
  ChartNoAxesCombined,
  Video,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { isCloud } from '@/shared/constants/edition'
import { disabledFeatures } from './disabled-features'

type Submenu = {
  href: string
  label: string
  active: boolean
  className?: string
  enabled?: boolean
}

type Menu = {
  type?: 'divider' | 'group'
  href?: string
  label?: string
  labelRender?: React.ReactNode
  active?: boolean
  icon?: LucideIcon | React.ReactElement
  submenus?: Submenu[]
  children?: Menu[]
  collapsible?: boolean
  defaultOpen?: boolean
  className?: string
  enabled?: boolean
  /**
   * Vương miện 👑 "tính năng trả phí". Ở bản OSS không có bậc gói nào để nâng cấp lên, nên mọi
   * chỗ đặt `true` đều đặt `isCloud` — gate ở ĐÂY chứ không ở `layout/sidebar/sidebar-middle.tsx`,
   * vì `shared/components/layout/` là vỏ giao diện dùng làm tiêu chí nghiệm thu, không được sửa.
   */
  isPremium?: boolean
  isBeta?: boolean
  menuRole?: RolePermissionKey[]
}

type Group = {
  groupLabel: string
  menus: Menu[]
  enabled?: boolean
  groupRole?: RolePermissionKey[]
}

export function getMenuList(pathname: string): Group[] {
  const { org_id } = useParams<{ org_id: string }>()
  const { hasPermission } = useOrganizationStoreProvider()
  const { t } = useTranslation(['layout'])

  // const { orgPlan } = useOrganizationStoreProvider();
  return [
    {
      groupLabel: t('sidebar.groups.overview'),
      menus: [
        {
          href: `/org/${org_id}/onboarding`,
          label: t('sidebar.onboarding'),
          active: pathname.includes('/onboarding'),
          icon: (
            <>
              <svg width="0" height="0" className="absolute overflow-hidden">
                <defs>
                  <linearGradient
                    id="sidebar-get-started-gradient"
                    x1="0"
                    y1="0"
                    x2="24"
                    y2="0"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0.08%" stopColor="var(--color-beta-tag-from)" />
                    <stop offset="98.87%" stopColor="var(--color-beta-tag-to)" />
                  </linearGradient>
                </defs>
              </svg>
              <Rocket className="w-5! h-5!" stroke="url(#sidebar-get-started-gradient)" />
            </>
          ),
          submenus: [],
          isPremium: false,
          enabled: !disabledFeatures.ONBOARDING,
        },
        {
          href: `/org/${org_id}/overview`,
          label: t('sidebar.overview'),
          active: pathname.includes('/overview'),
          icon: House,
          submenus: [],
          isPremium: false,
        },
        {
          href: `/org/${org_id}/dashboards`,
          label: t('sidebar.dashboards'),
          active: pathname.includes('/dashboards'),
          icon: LayoutDashboard,
          submenus: [],
          // isPremium: true,
          // Dashboards là bản cloud — mã ở src/ee/features/dashboards. Chủ sản phẩm chốt
          // 2026-11-04 (quyết định #2): bản OSS giữ **Overview**, không giữ Dashboards.
          enabled: isCloud && !disabledFeatures.DASHBOARDS,
        },
      ],
      enabled:
        !disabledFeatures.OVERVIEW_GROUP && hasPermission(ROLE_PERMISSION_KEYS.VIEW_DASHBOARD),
    },
    {
      groupLabel: t('sidebar.groups.linkAttribution'),
      menus: [
        {
          href: `/org/${org_id}/custom-domains`,
          label: t('sidebar.domain'),
          active: pathname === `/org/${org_id}/custom-domains`,
          icon: GlobeIcon,
          submenus: [],
          // isPremium: true,
          enabled: hasPermission(ROLE_PERMISSION_KEYS.MANAGE_DOMAINS),
        },
        // Link và Artifact gộp thành MỘT mục 2026-10-27. Chúng vốn đã là một tập dữ liệu:
        // artifact là touch point `content_type = 'ARTIFACT'`, và danh sách /short-links luôn
        // trả về cả hai (trên LiHi: 3 link + 58 artifact) — chỉ là trước đây dán nhãn hết
        // thành "LINK". Hai mục sidebar là thứ khiến người dùng tưởng đó là hai kho riêng.
        //
        // Route /org/<id>/artifacts VẪN SỐNG, chỉ bỏ khỏi menu — y như Realtime bên dưới.
        // Nó còn giữ các hành động riêng của artifact (replace file, publish) mà danh sách gộp
        // chưa có, và đang có link sâu trỏ vào.
        {
          href: `/org/${org_id}/short-links`,
          label: t('sidebar.linkAndArtifact'),
          // Khớp cả /artifacts: mở trang đó bằng link trực tiếp thì mục này vẫn phải sáng,
          // không thì sidebar trông như người dùng đang ở ngoài mọi mục.
          active: [`/org/${org_id}/short-links`, `/org/${org_id}/artifacts`].some((path) =>
            pathname.includes(path)
          ),
          isPremium: false,
          icon: Link2,
          submenus: [],
          enabled: hasPermission(ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS),
        },
        // Realtime đã gom vào trang Analytics (dưới bản đồ) 2026-10-23 nên bỏ khỏi menu.
        // Route /org/<id>/realtime vẫn sống để link cũ và bookmark không chết.
        {
          href: `/org/${org_id}/analytics`,
          label: t('sidebar.analytics'),
          active: pathname === `/org/${org_id}/analytics`,
          icon: ChartNoAxesCombined,
          submenus: [],
          isPremium: false,
          enabled: hasPermission(ROLE_PERMISSION_KEYS.VIEW_ANALYTICS),
        },
        {
          href: `/org/${org_id}/deep-link-analytics`,
          label: t('sidebar.deepLinks'),
          active: pathname.includes('/deep-link-analytics'),
          icon: Smartphone,
          submenus: [],
          isPremium: isCloud,
          isBeta: true,
          enabled:
            // Deep Links là tính năng bản cloud — mã nằm ở src/ee/features/deep-link-analytics.
            // Đây là mục DUY NHẤT biến mất khỏi sidebar ở bản OSS; xem ảnh nghiệm thu trong
            // docs/oss-split/01-kiem-ke.md.
            isCloud &&
            !disabledFeatures.DEEP_LINK_ANALYTICS &&
            hasPermission(ROLE_PERMISSION_KEYS.VIEW_ANALYTICS),
        },
        {
          href: `/org/${org_id}/conversions`,
          label: t('sidebar.conversions'),
          active: pathname.includes('/conversions'),
          icon: TrendingUp,
          submenus: [],
          isPremium: isCloud,
          enabled:
            // Conversions đi theo attribution — thứ chủ sản phẩm giữ lại bản thương mại
            // (quyết định #3). Mã ở src/ee/features/conversions.
            isCloud &&
            !disabledFeatures.ATTRIBUTION &&
            !disabledFeatures.CONVERSIONS &&
            hasPermission(ROLE_PERMISSION_KEYS.VIEW_ANALYTICS),
        },
        {
          href: `/org/${org_id}/customers`,
          label: t('sidebar.customers'),
          active: pathname.includes('/customers'),
          icon: Users,
          submenus: [],
          isPremium: isCloud,
          // Customers KHÔNG còn phụ thuộc `ATTRIBUTION` (chủ sản phẩm 2026-10-26: "chỉ hiện
          // Customers"). `ATTRIBUTION` là cờ nhóm của QQuik và nó còn đổi trang Overview
          // (`overview.tsx:26` LINKS_ONLY) lẫn dữ liệu analytics (`analytic.service.ts:540`),
          // nên hạ cờ đó để hiện một mục menu là đổi nhiều thứ không ai yêu cầu.
          // `CUSTOMERS` nay là công tắc duy nhất cho mục này — và `customers/page.tsx` cùng
          // `customers/[customer_id]/page.tsx` đọc ĐÚNG cờ đó, nếu không thì menu hiện mà bấm
          // vào bị redirect về /org/<id>.
          enabled:
            !disabledFeatures.CUSTOMERS && hasPermission(ROLE_PERMISSION_KEYS.VIEW_ANALYTICS),
        },
        // {
        //   type: 'group',
        //   label: t('sidebar.groups.conversion', { defaultValue: 'CONVERSION' }),
        //   collapsible: false,
        //   children: [

        //   ],
        // },
        // Nhóm ORGANIZE bỏ hẳn (chủ sản phẩm 2026-10-23): Spaces ẩn toàn bộ, Tags chuyển vào
        // sidebar của form tạo short link dưới Link Cloaking, UTM Templates vốn đã tắt từ trước.
        // Để lại nhóm rỗng thì sidebar còn một tiêu đề không có mục nào.
        // ⚠ Cập nhật 2026-10-28: route `/tags` vẫn sống, nhưng `/spaces` thì KHÔNG nữa —
        // middleware chuyển hướng mọi `/org/<id>/spaces*` về danh sách gộp (chốt chủ sản phẩm
        // sau khi đo prod: 32 collection, 44 touch point vẫn có space, nhưng vẫn ẩn hẳn).
        // Dữ liệu `collections` giữ nguyên trong DB; 44 hàng đó vẫn nằm trong danh sách gộp.
      ],
    },
    {
      groupLabel: t('sidebar.groups.behaviorAnalytics'),
      menus: [
        {
          href: `/org/${org_id}/link-journey`,
          label: t('sidebar.linkJourney'),
          active: pathname.includes('/link-journey'),
          icon: Route,
          submenus: [],
          isPremium: isCloud,
          enabled:
            !disabledFeatures.BEHAVIOR_ANALYTICS &&
            !disabledFeatures.LINK_JOURNEY &&
            hasPermission(ROLE_PERMISSION_KEYS.VIEW_ANALYTICS),
        },
        {
          href: `/org/${org_id}/funnels`,
          label: t('sidebar.funnels'),
          active: pathname.includes('/funnels'),
          icon: Funnel,
          submenus: [],
          isPremium: isCloud,
          enabled:
            !disabledFeatures.BEHAVIOR_ANALYTICS &&
            hasPermission(ROLE_PERMISSION_KEYS.VIEW_FUNNELS),
        },
        {
          href: `/org/${org_id}/site-analytics`,
          label: t('sidebar.siteAnalytics'),
          active: pathname.includes('/site-analytics'),
          icon: MousePointerClick,
          submenus: [],
          isPremium: isCloud,
          enabled:
            !disabledFeatures.BEHAVIOR_ANALYTICS &&
            !disabledFeatures.HEATMAP &&
            hasPermission(ROLE_PERMISSION_KEYS.VIEW_ANALYTICS),
        },
        {
          href: `/org/${org_id}/session-recordings`,
          label: t('sidebar.sessionRecordings'),
          active: pathname.includes('/session-recordings'),
          icon: Video,
          submenus: [],
          isPremium: isCloud,
          enabled:
            !disabledFeatures.BEHAVIOR_ANALYTICS &&
            !disabledFeatures.SESSION_RECORDING &&
            hasPermission(ROLE_PERMISSION_KEYS.VIEW_ANALYTICS),
        },
        {
          href: `/org/${org_id}/event-rules`,
          label: t('sidebar.eventRules'),
          active: pathname.includes('/event-rules'),
          icon: Zap,
          submenus: [],
          isPremium: isCloud,
          enabled:
            !disabledFeatures.BEHAVIOR_ANALYTICS &&
            hasPermission(ROLE_PERMISSION_KEYS.VIEW_ANALYTICS),
        },
        {
          href: `/org/${org_id}/forms`,
          label: t('sidebar.forms'),
          active: pathname.includes('/forms'),
          icon: ClipboardList,
          submenus: [],
          isPremium: isCloud,
          enabled: false,
        },
        // {
        //   href: `/org/${org_id}/campaigns`,
        //   label: t('sidebar.campaigns'),
        //   active: pathname.includes(`/org/${org_id}/campaigns`),
        //   icon: Megaphone,
        //   submenus: [],
        //   isPremium: true,
        //   enabled:
        //     !disabledFeatures.CAMPAIGNS && hasPermission(ROLE_PERMISSION_KEYS.VIEW_CAMPAIGNS),
        // },
      ],
      // Cả nhóm HÀNH VI TƯƠNG TÁC là bản cloud — chủ sản phẩm chốt 2026-11-05: năm tính năng
      // này (Hành trình Link, Funnels, Phân tích trang, Ghi lại phiên, Quy tắc sự kiện)
      // **không phát triển tiếp**, nên bản OSS không mang chúng. Mã đã nằm ở src/ee/features/
      // từ PR #6 (link-journey, funnels, site-analytics, heatmap, session-recordings,
      // event-rules, forms-analytics).
      //
      // Gate ở cấp NHÓM chứ không từng mục: năm mục vốn đã dùng chung cờ BEHAVIOR_ANALYTICS,
      // nên đặt một điều kiện ở đây thay vì năm điều kiện giống nhau — và tiêu đề nhóm cũng
      // biến mất theo, không để lại một tiêu đề rỗng.
      enabled: isCloud && !disabledFeatures.BEHAVIOR_ANALYTICS,
    },
    // {
    //   groupLabel: t('sidebar.groups.configure'),
    //   menus: [
    //Integration
    // {
    //   href: `/org/${org_id}/integrations`,
    //   label: t('sidebar.integration'),
    //   labelRender: <span className="flex items-center">{t('sidebar.integration')}</span>,
    //   active: pathname.includes('/integrations'),
    //   icon: HousePlug,
    //   submenus: [],
    //   isPremium: true,
    //   enabled:
    //     !disabledFeatures.INTEGRATIONS && hasPermission(ROLE_PERMISSION_KEYS.VIEW_INTEGRATIONS),
    // },
    // {
    //   href: `/org/${org_id}/audit-logs`,
    //   label: t('sidebar.auditLogs'),
    //   active: pathname.includes('/audit-logs'),
    //   icon: FileText,
    //   submenus: [],
    //   isPremium: true,
    //   enabled: hasPermission(ROLE_PERMISSION_KEYS.VIEW_AUDIT_LOGS),
    // },
    // {
    //   href: `/org/${org_id}/settings`,
    //   label: t('sidebar.setting'),
    //   active: pathname === `/org/${org_id}/settings`,
    //   icon: SettingsIcon,
    //   submenus: [],
    //   isPremium: false,
    //   enabled:
    //     hasPermission(ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION) ||
    //     hasPermission(ROLE_PERMISSION_KEYS.MANAGE_MEMBERS),
    // },
    // ],
    // },
  ]
}
