'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Tooltip, TooltipTrigger, TooltipProvider } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/cn'
import { supportedLngs } from '@/shared/lib/i18n/config'
import { Loader2, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LanguageNavProps {
  icon?: React.ReactNode
  fontWeight?: string
  className?: string
}

export function LanguageNavInApp({
  icon,
  fontWeight = 'semibold',
  className = '',
}: LanguageNavProps) {
  const mappingLanguage: Record<string, string> = {
    vi: 'Tiếng Việt',
    en: 'English',
  }
  const { i18n } = useTranslation()
  return (
    <DropdownMenu>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              {icon ? icon : <Loader2 className="w-4 h-4 animate-spin" />}
            </DropdownMenuTrigger>
          </TooltipTrigger>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent className="w-auto" align="start" forceMount sideOffset={14}>
        {supportedLngs.map((l, index) => {
          return (
            <DropdownMenuItem
              className="hover:cursor-pointer text-sm flex items-center justify-between"
              onClick={() => i18n.changeLanguage(l)}
              key={index}
            >
              <div className="flex items-center gap-1 text-slate-600">
                <div className={cn(`text-sm flex items-center font-${fontWeight}`, className)}>
                  {l.toUpperCase()}
                </div>
                -<p>{mappingLanguage[l]}</p>
              </div>
              {i18n.language === l && <Check className="w-4 h-4 text-green-600 stroke-[2px]" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
