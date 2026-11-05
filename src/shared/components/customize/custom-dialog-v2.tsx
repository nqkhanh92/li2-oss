import { useIsMobile } from '@/shared/hooks/use-mobile'
import React, { forwardRef, Ref, Suspense, useImperativeHandle, useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { cva, VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'
import { ResponsivePopover } from '../ui/responsive-popover'
import { Button } from '../ui/button'
import { HelpCircle } from 'lucide-react'
import { CustomDialogProvider } from '@/shared/providers/custom-dialog-provider'
import { SkeletonCard } from './skeleton-card'

export const dialogVariants = cva(
  'w-[calc(100vw-32px)] !rounded-[16px] max-h-[calc(100svh-32px)] overflow-y-hidden',
  {
    variants: {
      variant: {
        default: '',
      },
      size: {
        xs: 'md:w-[480px] md:max-w-[480px]',
        sm: 'md:w-[640px] md:max-w-[640px]',
        md: 'md:w-[768px] md:max-w-[768px]',
        lg: 'md:w-[1024px] md:max-w-[1024px]',
        xl: 'md:w-[1280px] md:max-w-7xl',
        full: 'w-full max-w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

type DialogOpenState = {
  open: boolean
  setOpen: (open: boolean) => void
}
type DialogEvents = {
  onOpenChange?: (open: boolean) => void
}
export type CustomDialogRef = { open: () => void; close: () => void }

interface Props
  extends Partial<DialogOpenState>, VariantProps<typeof dialogVariants>, DialogEvents {
  children: React.ReactNode | ((openState: DialogOpenState) => React.ReactNode)
  initialOpen?: boolean
  button?: React.ReactNode
  title?: string | React.ReactNode
  description?: string | React.ReactNode
  className?: string
  showTooltip?: boolean
  modal?: boolean
  onInteractOutside?: (event: any) => void
  noSeparator?: boolean
}
const CustomDialogV2 = (
  {
    children,
    initialOpen,
    open: _open,
    setOpen: _setOpen,
    button,
    title,
    description,
    size,
    onOpenChange,
    className,
    showTooltip = false,
    modal = true,
    onInteractOutside,
    noSeparator = false,
  }: Props,
  ref?: Ref<CustomDialogRef>
) => {
  const [open, setOpen] = useState(initialOpen ?? false)
  const openState: DialogOpenState = {
    open: _open ?? open,
    setOpen: _setOpen ?? setOpen,
  }

  const isMobile = useIsMobile()
  useImperativeHandle(ref, () => {
    return {
      open: () => openState.setOpen(true),
      close: () => openState.setOpen(false),
    }
  }, [])

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    onOpenChange?.(open)

    //Workaround for the bug that when dialog is closed during popover/dropdown is open, the body is not clickable
    // Only apply this workaround for modal dialogs, as non-modal dialogs don't have this issue
    if (modal) {
      setTimeout(() => {
        if (!open) {
          document.body.style.pointerEvents = ''
        }
      }, 100)
    }
  }

  if (isMobile) {
    return (
      <Drawer open={openState.open} onOpenChange={handleOpenChange} modal={modal}>
        {button && <DrawerTrigger asChild>{button}</DrawerTrigger>}
        <DrawerContent onInteractOutside={onInteractOutside} className="max-h-[85vh] flex flex-col">
          <DrawerHeader
            className={cn(
              'px-6 pt-4 pb-2 border-slate-300 text-slate-700 font-semibold flex-shrink-0',
              !noSeparator && 'border-b'
            )}
          >
            <DrawerTitle className="flex justify-start items-center text-l leading-7 gap-2">
              {title ?? 'Drawer Title'}
              {description && showTooltip && (
                <ResponsivePopover content={description} side="top" sideOffset={8} forceClick>
                  <Button variant="ghost" size="icon" className="rounded-full h-6 w-6 p-0">
                    <HelpCircle className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Button>
                </ResponsivePopover>
              )}
            </DrawerTitle>
            {description && !showTooltip && (
              <DrawerDescription className="text-s! text-slate-500 font-normal text-start!">
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-6 pt-6 pb-12 overflow-x-hidden">
            <CustomDialogProvider open={openState.open} setOpen={openState.setOpen}>
              {children instanceof Function ? children(openState) : children}
            </CustomDialogProvider>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={openState.open} onOpenChange={handleOpenChange} modal={modal}>
      {button && <DialogTrigger asChild>{button}</DialogTrigger>}
      <DialogContent
        onInteractOutside={onInteractOutside}
        iconCloseClassName="[&>svg]:text-slate-500 [&>svg]:w-6 [&>svg]:h-6 mr-[8px]"
        className={cn(dialogVariants({ size }), 'px-5 py-6', className)}
      >
        <DialogHeader
          className={cn(
            'mx-4 p-0 pb-2 border-slate-300 text-slate-700 font-semibold',
            !noSeparator && 'border-b'
          )}
        >
          <div className="flex justify-start items-center gap-2">
            <DialogTitle className="text-l leading-7">{title ?? 'Dialog Title'}</DialogTitle>
            {description && showTooltip && (
              <ResponsivePopover content={description} side="top" sideOffset={8}>
                <Button variant="ghost" size="icon" className="rounded-full h-6 w-6 p-0">
                  <HelpCircle className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
                </Button>
              </ResponsivePopover>
            )}
          </div>
          {description && !showTooltip && (
            <DialogDescription className="text-s! text-slate-500 font-normal">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overflow-x-hidden px-4">
          <CustomDialogProvider open={openState.open} setOpen={openState.setOpen}>
            {children instanceof Function ? children(openState) : children}
          </CustomDialogProvider>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default forwardRef(CustomDialogV2)
