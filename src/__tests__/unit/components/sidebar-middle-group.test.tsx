import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const menuList = [
  {
    groupLabel: 'NHOM-AN',
    enabled: false,
    menus: [{ href: '/org/org-1/overview', label: 'Overview', active: false, submenus: [] }],
  },
  {
    groupLabel: 'NHOM-HIEN',
    menus: [{ href: '/org/org-1/short-links', label: 'Short links', active: false, submenus: [] }],
  },
]

vi.mock('@/shared/constants/menu-list', () => ({
  getMenuList: () => menuList,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/org/org-1/short-links',
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({ isLoadingPermission: false }),
}))

vi.mock('@/shared/stores/event-store', () => ({
  useEventStore: () => ({ setEvent: vi.fn() }),
}))

vi.mock('@/shared/components/ui/sidebar', () => ({
  SidebarGroup: ({ children }: any) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: any) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: any) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: any) => <div>{children}</div>,
  SidebarMenuSub: ({ children }: any) => <div>{children}</div>,
  SidebarMenuSubButton: ({ children }: any) => <div>{children}</div>,
  SidebarMenuSubItem: ({ children }: any) => <div>{children}</div>,
  useSidebar: () => ({ open: true }),
}))

vi.mock('@/shared/components/layout/customize/loading-mask', () => ({
  LoadingMask: ({ children }: any) => <div>{children}</div>,
}))

describe('SidebarMiddle', () => {
  it('không render nhóm có enabled=false', async () => {
    const { SidebarMiddle } = await import(
      '@/shared/components/layout/sidebar/sidebar-middle'
    )
    render(<SidebarMiddle />)
    expect(screen.queryByText('NHOM-AN')).toBeNull()
    expect(screen.queryByText('Overview')).toBeNull()
    expect(screen.getByText('NHOM-HIEN')).toBeTruthy()
    expect(screen.getByText('Short links')).toBeTruthy()
  })
})
