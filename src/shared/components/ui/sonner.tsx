'use client'

import {
  BanIcon,
  CircleAlertIcon,
  CircleCheckBigIcon,
  InfoIcon,
  MessageCircleWarningIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()
  const pathname = usePathname()

  const isTouchPointDetail =
    /\/touch-points\/(create|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.test(pathname) ||
    /\/short-links(\/.*)?$/.test(pathname)

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-right"
      offset={isTouchPointDetail ? { top: 120 } : { top: 60 }}
      icons={{
        error: <BanIcon className="w-[18px]! h-[18px]! text-red-600" />,
        info: <InfoIcon className="w-[18px]! h-[18px]! text-blue-600" />,
        success: <CircleCheckBigIcon className="w-[18px]! h-[18px]! text-green-600" />,
        warning: <CircleAlertIcon className="w-[18px]! h-[18px]! text-yellow-600" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          title: 'font-medium text-[13px] leading-[1.4]',
          content: 'text-[12px] leading-[16px] min-w-[193px]!',
          success: 'bg-green-50! border-l-green-600! **:data-title:text-green-600',
          info: 'bg-blue-50! border-l-blue-600! **:data-title:text-blue-600',
          warning: 'bg-yellow-50! border-l-yellow-600! **:data-title:text-yellow-600',
          error: 'bg-red-50! border-l-red-600! **:data-title:text-red-600',
          toast:
            'flex gap-[6px] min-h-[42px] px-6! py-3! rounded-[8px]! border-l-2! border-t-0! border-b-0! border-r-0! bg-slate-50 border-l-slate-600',
          description: 'text-slate-600!',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      // toastOptions={{
      //   classNames: {
      //     toast:
      //       "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
      //     description: "group-[.toast]:text-muted-foreground",
      //     actionButton:
      //       "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
      //     cancelButton:
      //       "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
      //   },
      // }}
      {...props}
    />
  )
}

export { Toaster }
