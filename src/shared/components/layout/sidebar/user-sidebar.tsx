'use client'

import { Crown, User2, MessageSquarePlus, NewspaperIcon, MapIcon, Compass } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useSidebar } from '@/shared/components/ui/sidebar'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { usePlanProvider } from '@/shared/providers/plan-provider'
import { PAID_PLAN_KEYS } from '@/shared/types/plan-permission'
import { useCanny } from '@/shared/providers/canny-provider'
import { CustomAvatar } from './custom-avatar'
import { CustomBadge } from './custom-badge'
import { cn } from '@/shared/lib/utils'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from '@/shared/components/ui/dropdown-menu'

export function UserSidebar() {
  const { open } = useSidebar()
  const { profile } = useProfileProvider()
  const { plan } = usePlanProvider()
  const { openBoard, initChangelog, scriptLoaded, roadMapUrl } = useCanny()
  const { t } = useTranslation('layout')

  const getPlanCrownIcon = () => {
    if (PAID_PLAN_KEYS.includes(plan?.plans?.plan_key as any)) {
      return (
        <Crown className="w-[10px] h-[10px] max-w-[10px] max-h-[10px] fill-amber-300 bg-white rounded-full" />
      )
    }
    return null
  }

  useEffect(() => {
    if (scriptLoaded) {
      initChangelog()
    }
  }, [scriptLoaded])

  const hiddenBtnRef = useRef<HTMLButtonElement>(null)

  if (disabledFeatures.ROADMAP) return null

  return (
    <div className="w-full border-t border-slate-300 flex flex-col items-start justify-center py-2.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-3 group-data-[collapsible=icon]:gap-0 px-6 py-2.5 rounded-lg cursor-pointer w-full hover:bg-accent',
              !open && 'justify-center px-2'
            )}
          >
            <svg width="0" height="0" className="absolute overflow-hidden">
              <defs>
                <linearGradient id="sidebar-compass-gradient" x1="0" y1="0" x2="24" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0.08%" stopColor="var(--color-beta-tag-from)" />
                  <stop offset="98.87%" stopColor="var(--color-beta-tag-to)" />
                </linearGradient>
              </defs>
            </svg>
            <Compass className="w-5 h-5 shrink-0" stroke="url(#sidebar-compass-gradient)" />
            {open && (
              <p className="flex-1 text-s text-slate-600 font-normal leading-5">
                Roadmap & Requests
              </p>
            )}
            <button data-canny-changelog ref={hiddenBtnRef} className="w-0 translate-x-[-12px] translate-y-[-12px]"></button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent forceMount side="right" align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              window.open(roadMapUrl, '_blank')
            }}
            className="cursor-pointer"
          >
            <MapIcon className="w-4 h-4 mr-2" />
            <span>Roadmap</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            // data-canny-changelog
            disabled={!scriptLoaded}
            className="cursor-pointer"
            onClick={() => hiddenBtnRef.current?.click()}
          >
            <NewspaperIcon className="w-4 h-4 mr-2" />
            <span>Changelog</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setTimeout(() => {
                openBoard()
              }, 200)
            }}
            disabled={!scriptLoaded}
            className="cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            <span>Feature Request</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
