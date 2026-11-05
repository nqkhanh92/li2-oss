'use client'
import { cn } from '@/shared/lib/utils'
import { Navbar } from './content-layout-nav'
import { useSidebar } from '@/shared/components/ui/sidebar'
import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

interface ContentLayoutProps {
  title: string | React.ReactNode
  subTitle?: string | React.ReactNode
  children: React.ReactNode
  className?: string
  extra?: React.ReactNode
  isBackable?: boolean
  navBarEnabled?: boolean
  id?: string
  navBarClassName?: string
  backPath?: string
  suspenseFallback?: React.ReactNode
  footer?: React.ReactNode
  fixedFooter?: boolean
  compact?: boolean
}

export function ContentLayout({
  title,
  subTitle,
  children,
  className = '',
  isBackable = true,
  navBarEnabled = true,
  extra,
  id,
  navBarClassName,
  backPath,
  suspenseFallback,
  footer,
  compact = true,
}: ContentLayoutProps) {
  const { open, isMobile } = useSidebar()
  return (
    <>
      {navBarEnabled && (
        <Navbar
          compact={compact}
          title={title}
          subTitle={subTitle}
          extra={extra}
          isBackable={isBackable}
          className={navBarClassName}
          backPath={backPath}
        />
      )}
      <div
        className={cn(
          // ⚠ `--agent-dock-height` phải trừ Ở ĐÂY, không chỉ ở tổ tiên.
          //
          // Dock AI tự đo mình rồi đặt biến đó trên `documentElement`
          // (`agent-chat-panel.tsx:80`), và `(protected)/org/[org_id]/layout.tsx:85` áp nó làm
          // `paddingBottom` của `<main>`. Nhưng **vùng cuộn thật là div này**, và nó cao theo
          // viewport (`100dvh`) — chiều cao tính từ viewport thì padding của tổ tiên không ảnh
          // hưởng. Kết quả: dock che mất pagination ở cuối trang Link & Artifact.
          //
          // Hotfix trực tiếp trên prod .83 ngày 2026-11-04 (image 40c46af1) theo yêu cầu chủ sản
          // phẩm; commit này đưa nó vào repo để lần deploy sau không mất.
          'content-layout-div lg:px-12 md:px-6 py-6 w-full overflow-y-auto h-[calc(100dvh-52px-60px-var(--agent-dock-height,0px))] bg-background relative',
          !navBarEnabled && 'h-[calc(100dvh-52px-var(--agent-dock-height,0px))]',
          open ? 'px-4' : 'px-4',
          className
        )}
        id={id}
      >
        <Suspense
          fallback={
            suspenseFallback ?? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-16 h-16 animate-spin" />
              </div>
            )
          }
        >
          <div
            className={cn(
              'mx-auto',
              footer && 'pb-15 min-h-[calc(100%-60px)]',
              compact ? 'max-w-7xl' : 'max-w-full'
            )}
          >
            {children}
          </div>
        </Suspense>
      </div>
      {footer && (
        <div className="w-full flex h-15 box-content sticky bottom-0 border-t border-slate-300 bg-background">
          {footer}
        </div>
      )}
    </>
  )
}
