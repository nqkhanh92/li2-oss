'use client'

import Link from 'next/link'
import { UserNav } from './user-nav'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { AlignJustify, ChevronDown, Globe, KeyIcon, UsersRound } from 'lucide-react'
import { useEventStore } from '@/shared/stores/event-store'
import { useTranslation } from 'react-i18next'
import { LanguageNavInApp } from '../sidebar/language-dropdown'
import Image from 'next/image'
import { NotificationBell } from '@/features/notifications/components'
import { AgentChatTrigger } from '@/features/agent-chat/components'
import { OrganizationPopover } from '../sidebar/organization-popover'
import { DemoBanner } from './demo-banner'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { disabledFeatures } from '@/shared/constants/disabled-features'

export const Navbar = () => {
  const isMobile = useIsMobile()
  const { setEvent } = useEventStore()
  const { t, i18n } = useTranslation(['common'])
  const { organization, isOrgOwner } = useOrganizationStoreProvider()

  return (
    <>
      <header className="bg-slate-800 text-white h-[52px] fixed top-0 left-0 right-0 z-50 px-2 md:pl-4 lg:pl-6 md:pr-4 lg:pr-12">
        <div className="flex justify-between items-center h-full w-full gap-4 overflow-hidden">
          <div className="flex items-center md:w-full overflow-visible">
            <Link
              href="/"
              className="font-medium text-base hidden md:flex w-[150px] gap-[6px] items-center h-9 relative justify-start shrink-0"
            >
              <Image
                src="/images/li2-logo-withtext.svg"
                alt={t('common:appName')}
                className="object-contain object-left"
                fill={true}
                priority
              />
            </Link>

            {/* Org selector — border + padding only on md+ */}
            <div className="flex items-center md:border-l md:border-white/30 md:px-6 shrink-0 h-6">
              <OrganizationPopover open={true}>
                <button className="flex items-center gap-2 text-white hover:bg-white/10 rounded-md px-2 py-1.5 transition-colors">
                  <div className="w-6 h-6 rounded-md bg-[linear-gradient(90deg,#B9AAFF_0.08%,#D6A4AF_98.87%)] flex items-center justify-center shrink-0">
                    {organization && (
                      <span className="[&_svg]:w-3.5 [&_svg]:h-3.5 text-white">
                        {isOrgOwner ? <KeyIcon /> : <UsersRound />}
                      </span>
                    )}
                  </div>
                  <span className="text-s font-normal truncate max-w-[80px] md:max-w-[160px]">
                    {organization?.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-white shrink-0" />
                </button>
              </OrganizationPopover>
            </div>
          </div>

          <div className="flex gap-1 md:gap-2 items-center w-full justify-end">
            <div className="relative flex p-2 items-center gap-1 rounded-full">
              <LanguageNavInApp
                className="text-slate-600"
                icon={
                  <div className="flex items-center gap-1 rounded-full cursor-pointer transition-colors duration-300 group">
                    <Globe className="hidden md:block w-5 h-5 min-w-5 min-h-5" />
                    <p className="text-xs leading-[16px] font-medium uppercase flex items-center">
                      {i18n.language.toUpperCase()}
                      <ChevronDown size={16} className="w-4 h-4 items-center justify-center flex" />
                    </p>
                  </div>
                }
              />
            </div>
            <NotificationBell />
            {!disabledFeatures.AI_CHAT && <AgentChatTrigger />}
            <UserNav />
            {isMobile && (
              <AlignJustify
                className="cursor-pointer"
                onClick={() => setEvent('open-mobile-sidebar')}
              />
            )}
          </div>
        </div>
      </header>
      <DemoBanner />
    </>
  )
}
