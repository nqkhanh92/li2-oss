import { Lock, QrCode, SlidersHorizontal, Tags, type LucideIcon } from 'lucide-react'

import {
  SIDEBAR_ITEM_ICONS,
  SIDEBAR_ITEM_LABELS,
  type SidebarItemKey,
} from '@/features/short-links/components/short-link-form/short-link-form.constants'

export const ARTIFACT_CREATE_SECTIONS = ['basic', 'access', 'qr', 'tags'] as const
export type ArtifactCreateSection = (typeof ARTIFACT_CREATE_SECTIONS)[number]

export const ARTIFACT_SECTION_ICONS: Record<ArtifactCreateSection, LucideIcon> = {
  basic: SlidersHorizontal,
  access: Lock,
  qr: QrCode,
  tags: Tags,
}

export const ARTIFACT_SECTION_LABELS: Record<ArtifactCreateSection, string> = {
  basic: 'artifact:create.sections.basic',
  access: 'artifact:create.sections.access',
  qr: 'artifact:create.sections.qr',
  tags: 'artifact:create.sections.tags',
}

/**
 * Bốn mục của Short link, hiện MỜ và KHÔNG bấm được — cố ý (mockup §2): bảng `artifacts` không có
 * hạn dùng, không có giới hạn lượt, nên bốn thứ này sẽ không bao giờ mở ở tab Artifact. Để chúng ở
 * đây là để người dùng hiểu vì sao tab kia dài hơn, chứ không phải để trang trí.
 *
 * Icon và nhãn lấy đúng từ bảng của Short link: cùng một tính năng không được mang hai cái tên ở
 * hai tab cạnh nhau, và cách này không sinh thêm khoá dịch nào.
 */
export const SHORT_LINK_ONLY_ITEMS: SidebarItemKey[] = [
  'smart_targeting',
  'utm_builder',
  'link_expiration',
  'click_limitation',
]

export const shortLinkOnlyView = (key: SidebarItemKey) => ({
  Icon: SIDEBAR_ITEM_ICONS[key],
  labelKey: SIDEBAR_ITEM_LABELS[key],
})
