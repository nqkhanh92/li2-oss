'use client'

import React, { Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { OrganizationTab } from './tabs/organization-tab'
import { ProfileTab } from './tabs/profile-tab'
import { AccountTab } from './tabs/account-tab'
import { DeveloperTab } from './tabs/developer-tab'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { SidebarProvider } from '@/shared/components/ui/sidebar'
import { SettingSidebar } from './sidebar/setting-sidebar'
import { useEffect } from 'react'
import { Loader } from 'lucide-react'
import { OrgQuota } from '@/shared/types/plan-permission'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  SETTING_TABS,
  SECTION_TO_TAB_MAP,
  type SettingTab,
  type SettingSection,
} from '../constants/sections'
export const SettingsSection = ({ orgQuota }: { orgQuota: OrgQuota | null }) => {
  const { organization, orgPlan, hasPermission } = useOrganizationStoreProvider()
  const { profile } = useProfileProvider()

  const [selectedTab, setSelectedTab] = React.useState<SettingTab>(SETTING_TABS.ACCOUNT)
  const [hash, setHash] = React.useState<string>('account-planning')
  const scrollRef = React.useRef<string | null>(null)
  const hasInitialized = React.useRef(false)
  const isScrollingProgrammatically = React.useRef(false)

  const handleTabSelect = (href: string) => {
    const [tab, hash] = href.split('#')
    setSelectedTab(tab as SettingTab)
    setHash(hash)
    isScrollingProgrammatically.current = true
    scrollRef.current = hash

    // Update URL hash
    if (hash) {
      window.history.pushState(null, '', `#${hash}`)
    } else {
      window.history.pushState(null, '', `#${tab}`)
    }
  }

  // Handle URL hash on mount and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const urlHash = window.location.hash.slice(1) // Remove the '#'
      if (urlHash) {
        // Check if hash contains tab#section format
        if (urlHash.includes('#')) {
          const [tab, sectionId] = urlHash.split('#')
          setSelectedTab(tab as SettingTab)
          if (sectionId) {
            setHash(sectionId)
            isScrollingProgrammatically.current = true
            scrollRef.current = sectionId
          }
        } else {
          // If no tab specified, look up which tab contains this section
          const tab = SECTION_TO_TAB_MAP[urlHash as SettingSection]
          if (tab) {
            setSelectedTab(tab)
            setHash(urlHash)
            isScrollingProgrammatically.current = true
            scrollRef.current = urlHash
          } else {
            // Fallback: treat as section ID in current tab
            isScrollingProgrammatically.current = true
            scrollRef.current = urlHash
          }
        }
      }
    }

    // Handle initial hash on mount
    if (!hasInitialized.current) {
      hasInitialized.current = true
      handleHashChange()
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // IntersectionObserver to update URL hash when scrolling to sections
  useEffect(() => {
    const container = document.getElementById('setting-section')
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Only update URL if not programmatically scrolling
        if (isScrollingProgrammatically.current) return

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const sectionId = entry.target.id
            if (sectionId) {
              // Update URL hash without triggering scroll
              window.history.replaceState(null, '', `#${sectionId}`)
              setHash(sectionId)
            }
          }
        })
      },
      {
        root: container,
        threshold: [0.5],
        rootMargin: '-20% 0px -20% 0px',
      }
    )

    // Observe all sections
    const sections = container.querySelectorAll(
      '[id^="profile-"], [id^="account-"], [id^="organization-"], [id^="analytics-"], [id^="conversion-"], [id^="api-keys"]'
    )
    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [selectedTab])

  useEffect(() => {
    if (scrollRef.current) {
      const sectionId = scrollRef.current
      scrollRef.current = null
      setTimeout(() => {
        const container = document.getElementById('setting-section')
        if (!container) return
        const target = container.querySelector(`#${sectionId}`)
        if (target) {
          const containerTop = container.getBoundingClientRect().top
          const targetTop = target.getBoundingClientRect().top
          const scrollTop = container.scrollTop + (targetTop - containerTop)

          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth',
          })

          // Reset programmatic scroll flag after animation completes
          setTimeout(() => {
            isScrollingProgrammatically.current = false
          }, 1000)
        }
      }, 100)
    }
  }, [scrollRef.current])

  const { t } = useTranslation('setting')

  return (
    <div className="overflow-hidden relative lg:p-4 px-0 py-4">
      <SidebarProvider defaultOpen={true} className="h-full justify-between md:flex hidden">
        <SettingSidebar
          className="pt-0 rounded-none md:flex hidden h-full"
          onTabSelect={handleTabSelect}
          selectedTab={selectedTab}
          hash={hash}
        />
        <main className="flex overflow-hidden w-full pb-4 mr-0 md:ml-[220px]">
          <Tabs value={selectedTab} onValueChange={handleTabSelect} className="space-y-2 w-full">
            <TabsList className="hidden">
              <TabsTrigger value="organization">{t('sidebar.organization.label')}</TabsTrigger>
              {/* <TabsTrigger value="profile">{t('sidebar.profile.label')}</TabsTrigger> */}
              <TabsTrigger value="account">{t('sidebar.subscription.label')}</TabsTrigger>
              {!disabledFeatures.DEVELOPER_SETTINGS && (
                <TabsTrigger value="developer">{t('sidebar.developer.label')}</TabsTrigger>
              )}
            </TabsList>
            <div className="px-6 py-4">
              <Suspense fallback={<Skeleton className="h-[320px]" />}>
                <TabsContent value="organization">
                  <OrganizationTab organization={organization} />
                </TabsContent>
                {/* <TabsContent value="profile">
                  {profile ? (
                    <ProfileTab profile={profile} />
                  ) : (
                    <Loader className="w-4 h-4 animate-spin" />
                  )}
                </TabsContent> */}
                <TabsContent value="account">
                  <AccountTab orgPlan={orgPlan} orgQuota={orgQuota} />
                </TabsContent>
                {!disabledFeatures.DEVELOPER_SETTINGS &&
                  hasPermission(ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION) && (
                    <TabsContent value="developer">
                      <DeveloperTab />
                    </TabsContent>
                  )}
              </Suspense>
            </div>
          </Tabs>
        </main>
      </SidebarProvider>
      <div className="md:hidden flex flex-col gap-4 ">
        {/* {profile ? <ProfileTab profile={profile} /> : <Loader className="w-4 h-4 animate-spin" />} */}
        {orgPlan && orgQuota ? (
          <AccountTab orgPlan={orgPlan} orgQuota={orgQuota} />
        ) : (
          <Loader className="w-4 h-4 animate-spin" />
        )}
        {organization ? (
          <OrganizationTab organization={organization} />
        ) : (
          <Loader className="w-4 h-4 animate-spin" />
        )}
        <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>
      </div>
    </div>
  )
}
