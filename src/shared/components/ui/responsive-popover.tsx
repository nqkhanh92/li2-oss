"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import { cn } from "@/shared/lib/utils"

interface ResponsivePopoverProps {
  children: React.ReactNode
  content: React.ReactNode
  contentClassName?: string
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  /**
   * If true, the popover will always use click behavior (even on desktop)
   */
  forceClick?: boolean
  /**
   * Custom open state control (optional)
   */
  open?: boolean
  /**
   * Custom open state change handler (optional)
   */
  onOpenChange?: (open: boolean) => void
  /**
   * Disable hover on desktop (click only)
   */
  disableHover?: boolean
}

/**
 * A responsive popover component that adapts to screen size:
 * - On desktop (large screens): Shows on hover
 * - On mobile: Shows on click
 *
 * @example
 * ```tsx
 * <ResponsivePopover
 *   content={<div>Popover content here</div>}
 *   align="start"
 *   side="top"
 * >
 *   <Button>Trigger</Button>
 * </ResponsivePopover>
 * ```
 */
export const ResponsivePopover = React.forwardRef<
  HTMLDivElement,
  ResponsivePopoverProps
>(
  (
    {
      children,
      content,
      contentClassName,
      align = "center",
      side = "bottom",
      sideOffset = 8,
      forceClick = false,
      open: controlledOpen,
      onOpenChange: controlledOnOpenChange,
      disableHover = false,
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [internalOpen, setInternalOpen] = React.useState(false)
    const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    // Use controlled state if provided, otherwise use internal state
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? controlledOnOpenChange || (() => {}) : setInternalOpen

    // Determine if we should use hover behavior
    const useHover = !isMobile && !forceClick && !disableHover

    const handleMouseEnter = () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = null
      }
      if (useHover) {
        setOpen(true)
      }
    }

    const handleMouseLeave = () => {
      if (useHover) {
        closeTimeoutRef.current = setTimeout(() => {
          setOpen(false)
        }, 150)
      }
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            ref={ref}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {children}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className={cn(contentClassName)}
          align={align}
          side={side}
          sideOffset={sideOffset}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </PopoverContent>
      </Popover>
    )
  }
)

ResponsivePopover.displayName = "ResponsivePopover"
