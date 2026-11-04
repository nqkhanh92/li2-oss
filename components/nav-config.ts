import { FileText, Link2, Plus, type LucideIcon } from 'lucide-react'

/**
 * Menu điều hướng. Tương ứng `src/shared/constants/menu-list.tsx` của bản thương mại, nhưng là
 * dữ liệu thuần chứ không phải hook: bản gốc phải là hook vì nó đọc `useParams().org_id` và
 * `hasPermission()` — bản OSS single-tenant không có org trong URL và không có RBAC, nên một
 * mảng hằng là đủ. Hằng thì import được từ cả server component.
 *
 * Chỉ ba mục vì bản OSS chỉ có ba tính năng. Customers / Funnels / Heatmap / Analytics của bản
 * thương mại KHÔNG tồn tại ở đây — thêm mục trỏ vào trang chưa có chỉ tạo ra lỗi 404.
 */

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  /**
   * `true` nghĩa là chỉ active khi pathname trùng khít. Cần cho `/links/new`: nếu so bằng tiền tố
   * thì mở trang tạo link sẽ làm sáng cả hai mục "Link" và "Tạo link".
   */
  exact?: boolean
}

export const navItems: NavItem[] = [
  { href: '/links', label: 'Link', icon: Link2 },
  { href: '/artifacts', label: 'Artifact', icon: FileText },
  { href: '/links/new', label: 'Tạo link', icon: Plus, exact: true },
]

/** Mục nào đang được mở. Dùng cho `data-active` của `SidebarMenuButton`. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href
  // `startsWith(href + '/')` chứ không phải `startsWith(href)`: nếu không, `/links-abc` cũng khớp.
  if (pathname === item.href) return true
  if (!pathname.startsWith(`${item.href}/`)) return false
  // `/links/new` thuộc về mục "Tạo link", đừng làm sáng cả "Link".
  return !navItems.some((other) => other.exact && other.href === pathname)
}
