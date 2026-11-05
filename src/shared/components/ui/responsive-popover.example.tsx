/**
 * This file contains usage examples for the ResponsivePopover component.
 * Delete this file if not needed.
 */

import { ResponsivePopover } from './responsive-popover'
import { Button } from './button'
import { Badge } from './badge'
import { CrownIcon, InfoIcon } from 'lucide-react'
import React from 'react'

// Example 1: Basic usage with a button
export function BasicExample() {
  return (
    <ResponsivePopover
      content={
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Popover Title</h4>
          <p className="text-sm text-muted-foreground">
            This is a responsive popover that shows on hover on desktop and click on mobile.
          </p>
        </div>
      }
      align="start"
      side="top"
    >
      <Button variant="outline">Hover or Click Me</Button>
    </ResponsivePopover>
  )
}

// Example 2: Premium badge with styled content
export function PremiumBadgeExample() {
  return (
    <ResponsivePopover
      content={
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/20 to-secondary-yellow/20">
            <CrownIcon className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold text-sm leading-none">Premium Feature</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This feature is available on the{' '}
              <span className="font-medium text-yellow-600">Premium</span> plan.
            </p>
          </div>
        </div>
      }
      contentClassName="w-80 border-yellow-500/20"
      align="start"
      side="top"
    >
      <Badge
        variant="outline"
        className="group relative flex items-center gap-1.5 border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-secondary-yellow/5 to-yellow-500/10 px-3 py-1 text-yellow-600 cursor-pointer"
      >
        <CrownIcon className="h-3.5 w-3.5" />
        <span className="font-semibold text-xs">Premium</span>
      </Badge>
    </ResponsivePopover>
  )
}

// Example 3: Info icon with controlled state
export function ControlledExample() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex items-center gap-2">
      <span>Some text</span>
      <ResponsivePopover
        open={open}
        onOpenChange={setOpen}
        content={
          <div className="space-y-2">
            <p className="text-sm">Additional information here</p>
            <Button size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        }
        align="center"
        side="top"
      >
        <InfoIcon className="h-4 w-4 text-muted-foreground cursor-pointer" />
      </ResponsivePopover>
    </div>
  )
}

// Example 4: Force click behavior (no hover on desktop)
export function ClickOnlyExample() {
  return (
    <ResponsivePopover
      forceClick
      content={
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Click Only</h4>
          <p className="text-sm text-muted-foreground">
            This popover only opens on click, even on desktop.
          </p>
        </div>
      }
    >
      <Button variant="outline">Click Only (No Hover)</Button>
    </ResponsivePopover>
  )
}

// Example 5: Disable hover, use click only
export function DisableHoverExample() {
  return (
    <ResponsivePopover
      disableHover
      content={
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Click to Open</h4>
          <p className="text-sm text-muted-foreground">Hover is disabled. Click to toggle.</p>
        </div>
      }
    >
      <Button>Click to Toggle</Button>
    </ResponsivePopover>
  )
}

// Example 6: Custom styling and positioning
export function CustomStyledExample() {
  return (
    <ResponsivePopover
      content={
        <div className="space-y-3">
          <h4 className="font-semibold text-sm border-b pb-2">Menu Options</h4>
          <div className="flex flex-col gap-2">
            <button className="text-sm text-left px-2 py-1 hover:bg-slate-100 rounded">
              Option 1
            </button>
            <button className="text-sm text-left px-2 py-1 hover:bg-slate-100 rounded">
              Option 2
            </button>
            <button className="text-sm text-left px-2 py-1 hover:bg-slate-100 rounded">
              Option 3
            </button>
          </div>
        </div>
      }
      contentClassName="w-64 bg-background rounded-lg border border-slate-200 shadow-lg"
      align="end"
      side="bottom"
      sideOffset={12}
    >
      <Button variant="ghost" size="sm">
        Open Menu
      </Button>
    </ResponsivePopover>
  )
}
