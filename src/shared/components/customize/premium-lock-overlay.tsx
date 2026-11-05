'use client'

import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import Link from 'next/link'

interface PremiumLockOverlayProps {
  locked: boolean
  featureName: string
  children: React.ReactNode
  variant?: 'blur' | 'overlay' | 'inline'
  upgradeUrl?: string
}

/**
 * PremiumLockOverlay Component
 *
 * Wraps any content with a premium feature lock overlay.
 * Shows an upgrade prompt when the feature is locked based on the user's plan.
 *
 * @param locked - Whether the feature is locked (based on plan check)
 * @param featureName - Display name of the locked feature
 * @param children - Content to wrap (will be disabled/blurred when locked)
 * @param variant - Display style: 'inline' (default), 'blur', or 'overlay'
 * @param upgradeUrl - URL to redirect users for upgrading (default: '/pricing')
 */
export const PremiumLockOverlay = ({
  locked,
  featureName,
  children,
  variant = 'inline',
  upgradeUrl = '/pricing',
}: PremiumLockOverlayProps) => {
  const { t } = useTranslation(['common'])

  // If not locked, render children without any wrapper
  if (!locked) {
    return <>{children}</>
  }

  // Inline variant: Shows lock UI overlay with disabled content
  if (variant === 'inline') {
    return (
      <div className="relative">
        {/* Disabled content layer */}
        <div className="pointer-events-none opacity-50 select-none">{children}</div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-amber-200 shadow-lg px-6 py-4 max-w-sm text-center">
            <Lock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {t('common:premium.locked_feature', {
                feature: featureName,
                defaultValue: `${featureName} is a premium feature`,
              })}
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              {t('common:premium.upgrade_to_unlock', {
                defaultValue: 'Upgrade your plan to unlock this feature',
              })}
            </p>
            <Link href={upgradeUrl}>
              <Button size="sm" className="w-full">
                {t('common:premium.upgrade_plan', {
                  defaultValue: 'Upgrade Plan',
                })}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Blur variant: Blurs content with subtle lock indicator
  if (variant === 'blur') {
    return (
      <div className="relative">
        <div
          className={cn('blur-sm pointer-events-none select-none', 'transition-all duration-200')}
        >
          {children}
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Link href={upgradeUrl}>
            <Button size="sm" variant="secondary" className="gap-2">
              <Lock className="w-4 h-4" />
              {t('common:premium.upgrade', { defaultValue: 'Upgrade' })}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Overlay variant: Dark overlay with centered message
  if (variant === 'overlay') {
    return (
      <div className="relative">
        <div className="opacity-30 pointer-events-none select-none">{children}</div>
        <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg border shadow-xl px-8 py-6 max-w-md text-center">
            <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-2">{featureName}</h3>
            <p className="text-sm text-slate-600 mb-4">
              {t('common:premium.upgrade_to_unlock', {
                defaultValue: 'Upgrade your plan to unlock this feature',
              })}
            </p>
            <Link href={upgradeUrl}>
              <Button className="w-full">
                {t('common:premium.upgrade_plan', {
                  defaultValue: 'Upgrade Plan',
                })}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Fallback: render children normally
  return <>{children}</>
}
