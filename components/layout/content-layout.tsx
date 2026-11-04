'use client'

import React, { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

interface ContentLayoutProps {
  title: string | React.ReactNode
  subTitle?: string | React.ReactNode
  children: React.ReactNode
  className?: string
  /** Nút/điều khiển đặt bên phải dải tiêu đề (vd nút "Tạo link"). */
  extra?: React.ReactNode
  /**
   * `description` và `action` là tên gọi khác của `subTitle` và `extra`.
   *
   * Vì sao có cả hai: tên `subTitle`/`extra` là để trùng với `ContentLayout` của bản thương mại,
   * nhưng các trang trong bản OSS đã gọi bằng `description`/`action` — tên dễ đọc hơn. Nhận cả
   * hai rẻ hơn là sửa mọi trang, và rẻ hơn là có hai component gần giống nhau.
   */
  description?: React.ReactNode
  action?: React.ReactNode
  /**
   * Bản gốc mặc định `true`. Ở đây mặc định `false`: trang danh sách là điểm đến đầu tiên sau khi
   * đăng nhập, mũi tên "lùi" ở đó sẽ ném người dùng ra khỏi app. Trang con tự bật khi cần.
   */
  isBackable?: boolean
  backPath?: string
  id?: string
  navBarEnabled?: boolean
  navBarClassName?: string
  suspenseFallback?: React.ReactNode
  footer?: React.ReactNode
  /** `true` = khung nội dung giới hạn `max-w-7xl`; `false` = tràn hết chiều ngang. */
  compact?: boolean
}

/**
 * Khung nội dung của một trang. Giữ đúng ba con số của bản thương mại để bố cục trùng khít:
 * thanh trên 52px (`navbar.tsx`), dải tiêu đề 60px, phần còn lại là vùng cuộn.
 *
 * Khác bản gốc một chỗ: nút lùi dùng `useRouter().back()` thẳng, thay vì `useFormWarningProvider`
 * (provider cảnh báo "bạn có form chưa lưu" — bản OSS chưa có nó, và dựng cả một provider chỉ để
 * một mũi tên hoạt động là ngược thứ tự).
 */
export function ContentLayout({
  title,
  subTitle,
  children,
  className = '',
  extra,
  description,
  action,
  isBackable = false,
  backPath,
  id,
  navBarEnabled = true,
  navBarClassName,
  suspenseFallback,
  footer,
  compact = true,
}: ContentLayoutProps) {
  const router = useRouter()
  const resolvedSubTitle = subTitle ?? description
  const resolvedExtra = extra ?? action

  return (
    <>
      {navBarEnabled && (
        <div
          className={cn(
            'bg-background h-[60px] min-h-[60px] w-full z-5 px-4 md:px-12 border-b',
            resolvedSubTitle ? 'py-2' : 'py-3',
            navBarClassName
          )}
        >
          <div
            className={cn(
              'h-full mx-auto flex items-center gap-3',
              compact ? 'max-w-7xl' : 'max-w-full'
            )}
          >
            {isBackable && (
              <button
                type="button"
                aria-label="Quay lại"
                onClick={() => (backPath ? router.push(backPath) : router.back())}
                className="cursor-pointer flex items-center text-slate-500"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <div className="flex flex-col justify-center space-y-0.5 min-w-0">
              <h1 className="font-medium text-l w-full text-foreground truncate">{title}</h1>
              {resolvedSubTitle && (
                <span className="text-s text-slate-500">{resolvedSubTitle}</span>
              )}
            </div>
            {resolvedExtra && (
              <div className="flex flex-1 items-center justify-end gap-2">{resolvedExtra}</div>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          'content-layout-div px-4 md:px-6 lg:px-12 py-6 w-full overflow-y-auto h-[calc(100dvh-52px-60px)] bg-background relative',
          !navBarEnabled && 'h-[calc(100dvh-52px)]',
          className
        )}
        id={id}
      >
        <Suspense
          fallback={
            suspenseFallback ?? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-16 h-16 animate-spin" aria-hidden="true" />
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
