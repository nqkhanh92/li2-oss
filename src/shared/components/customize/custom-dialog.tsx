import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { CustomDialogProvider } from '@/shared/providers/custom-dialog-provider'
import React, { useState, useImperativeHandle, forwardRef, Ref } from 'react'
import { HelpCircle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
type CustomDialogProps = {
  children?: ({ open, close }: { open: () => void; close: () => void }) => React.ReactNode
  button?: React.ReactNode
  title?: string | React.ReactNode
  description?: string
  footer?: React.ReactNode
  noButton?: boolean
  noFooter?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xs' | 'xxs'
  headerClassName?: string
  initialOpen?: boolean
  className?: string
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disableBackdropClose?: boolean
  iconCloseClassName?: string
  tooltipContent?: string | React.ReactNode
  useTooltip?: boolean
}
export type DialogCustomRef = { open: () => void; close: () => void }
const DialogCustom = (
  {
    children,
    button,
    title,
    description,
    footer,
    noButton,
    noFooter,
    size,
    headerClassName,
    initialOpen,
    isOpen: openControl,
    className,
    onOpenChange,
    disableBackdropClose,
    iconCloseClassName,
    tooltipContent,
    useTooltip,
  }: CustomDialogProps,
  ref?: Ref<DialogCustomRef>
) => {
  const [isOpen, setIsOpen] = useState(initialOpen ?? false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const close = () => {
    setIsOpen(false)
    onOpenChange?.(false)
  }
  const open = () => {
    setIsOpen(true)
    onOpenChange?.(true)
  }
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    onOpenChange?.(open)
  }

  useImperativeHandle(ref, () => {
    return {
      open,
      close,
    }
  }, [])
  return (
    <Dialog open={openControl ?? isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {noButton ? null : (button ?? <Button variant="outline">Open</Button>)}
      </DialogTrigger>
      {/* <DialogContent className="lg:max-w-[800px] overflow-hidden inline-block"> */}
      <DialogContent
        iconCloseClassName={iconCloseClassName}
        className={cn(
          className,
          'overflow-y-auto hover:overflow--scroll overflow-x-hidden inline-block max-w-(--breakpoint-xl) md:p-6 p-4 rounded-2xl! max-h-[90vh] md:max-h-[85vh]',
          size === 'xxs' && 'md:w-[360px] w-[calc(100vw-32px)]',
          size == 'xs' && 'md:w-[480px] w-[calc(100vw-32px)]',
          size === 'sm' && 'md:w-[640px] w-[calc(100vw-32px)]',
          size == 'md' && 'md:w-[768px] w-[calc(100vw-32px)]',

          size == 'lg' && 'lg:w-[1024px] md:w-[calc(100vw-32px)] w-[calc(100vw-32px)]',

          size == 'xl' && 'md:w-[1280px] w-[calc(100vw-32px)]'
        )}
        onInteractOutside={disableBackdropClose ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className={cn('space-y-0 mb-4', headerClassName)}>
          <DialogTitle className="text-foreground space-y-2">
            <div className="flex items-center gap-2">
              {title ?? 'Dialog Title'}
              {useTooltip && tooltipContent && (
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center cursor-pointer"
                      onMouseEnter={() => setPopoverOpen(true)}
                      onMouseLeave={() => setPopoverOpen(false)}
                      onClick={(e) => {
                        e.preventDefault()
                        setPopoverOpen(!popoverOpen)
                      }}
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    className="max-w-xs text-sm"
                    onMouseEnter={() => setPopoverOpen(true)}
                    onMouseLeave={() => setPopoverOpen(false)}
                  >
                    {tooltipContent}
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {!useTooltip && tooltipContent && (
              <div className="text-sm font-normal text-slate-600 leading-relaxed">
                {tooltipContent}
              </div>
            )}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <CustomDialogProvider open={isOpen} setOpen={setIsOpen}>
          <div className="max-h-[calc(90vh-120px)] md:max-h-[calc(85vh-120px)] overflow-y-auto">
            {children?.({ open, close }) ?? <div className="grid gap-4 py-4">Dialog Content</div>}
          </div>
        </CustomDialogProvider>
        {!noFooter && (
          <DialogFooter className="mt-2">
            {footer ?? (
              <DialogClose asChild>
                <Button type="submit">Close</Button>
              </DialogClose>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const CustomDialog: React.ForwardRefExoticComponent<
  CustomDialogProps & React.RefAttributes<DialogCustomRef>
> = forwardRef<DialogCustomRef, CustomDialogProps>(DialogCustom)
