'use client'

import { cn } from '@/shared/lib/utils'

/**
 * Một khối của trang chi tiết một trang cuộn. `id` không phải để trang trí: header cuộn tới
 * `#sec-replace` khi bấm nút gộp mà chưa chọn gì, và thẻ ở danh sách nhảy thẳng vào
 * `#sec-analytics` / `#sec-replace` — nên id là phần hợp đồng của khối, không phải chi tiết nội bộ.
 */
export const ArtifactSection = ({
  id,
  title,
  lead,
  actions,
  children,
  className,
}: {
  id: string
  title: string
  lead?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) => (
  <section
    id={id}
    className={cn(
      'flex flex-col gap-4 border-b border-slate-100 px-5 py-6 last:border-0',
      className
    )}
  >
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-m font-semibold text-foreground">{title}</h2>
        {lead && <p className="text-xs text-slate-500">{lead}</p>}
      </div>
      {actions}
    </div>
    {children}
  </section>
)

const NOTICE_TONE: Record<'success' | 'warning' | 'error' | 'neutral' | 'info', string> = {
  success: 'border-semantic-success/25 bg-semantic-success/5 [&_svg]:text-semantic-success',
  warning: 'border-semantic-warning/40 bg-semantic-warning/10 [&_svg]:text-semantic-warning',
  error: 'border-semantic-error/25 bg-semantic-error/5 [&_svg]:text-semantic-error',
  neutral: 'border-slate-200 bg-slate-50 [&_svg]:text-slate-400',
  info: 'border-secondary-blue/25 bg-secondary-blue/5 [&_svg]:text-secondary-blue',
}

/**
 * Khối xanh, ô vàng, khối lỗi, khối xám là MỘT họ: cùng 8px, cùng padding, cùng vị trí icon, chỉ
 * khác sắc thái. Xanh ở hệ này nghĩa là "điều bạn lo đã được bảo toàn".
 */
export const ArtifactNotice = ({
  tone,
  Icon,
  title,
  body,
  action,
}: {
  tone: keyof typeof NOTICE_TONE
  Icon: React.ElementType
  title: string
  body: React.ReactNode
  action?: React.ReactNode
}) => (
  <div className={cn('flex gap-3 rounded-[8px] border p-3', NOTICE_TONE[tone])}>
    <Icon className="mt-0.5 size-4 shrink-0" />
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-s font-medium text-slate-700">{title}</p>
      <p className="text-xs text-slate-600">{body}</p>
      {action}
    </div>
  </div>
)
