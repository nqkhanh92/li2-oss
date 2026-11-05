'use client'

import * as React from 'react'
import { Check, KeyIcon, PlusIcon, Rocket, Settings, Star, UsersRound } from 'lucide-react'
import { getOrgPreference, setManualDefault, clearManualDefault } from '@/shared/lib/org-preference'
import { motion, AnimatePresence } from 'framer-motion'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { useGetOrganizations } from '@/features/organizations/hooks/queries/queries'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2Icon, NetworkIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useTranslation } from 'react-i18next'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { PRICING_URL } from '@/shared/constants'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { usePlanProvider } from '@/shared/providers/plan-provider'

interface OrganizationPopoverProps {
  open: boolean
  children: React.ReactNode
}

export function OrganizationPopover({ open, children }: OrganizationPopoverProps) {
  const { organization, switchOrganization, isOrgOwner, hasPermission } =
    useOrganizationStoreProvider()
  const { profile } = useProfileProvider()
  const { plan } = usePlanProvider()
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const { data: orgs, isLoading } = useGetOrganizations({ enabled: popoverOpen })
  const [orgPref, setOrgPref] = React.useState(() =>
    profile?.id ? getOrgPreference(profile.id) : undefined
  )

  React.useEffect(() => {
    if (popoverOpen && profile?.id) {
      setOrgPref(getOrgPreference(profile.id))
    }
  }, [popoverOpen, profile?.id])

  const [hoveredOrgId, setHoveredOrgId] = React.useState<string | null>(null)

  const handleStarClick = (e: React.MouseEvent, orgIdentifier: string) => {
    e.stopPropagation()
    if (!profile?.id) return
    const pref = getOrgPreference(profile.id)
    if (pref?.is_manual_set && pref.default_org_id === orgIdentifier) {
      clearManualDefault(profile.id)
    } else {
      setManualDefault(profile.id, orgIdentifier)
    }
    setOrgPref(getOrgPreference(profile.id))
  }
  const { push } = useRouter()
  const { t } = useTranslation('organization')
  const pathname = usePathname()

  const isMaxOrg = React.useMemo(() => {
    if (!plan?.plans?.max_orgs_per_user) return false
    return plan?.plans?.max_orgs_per_user <= (orgs?.length ?? 0)
  }, [plan, orgs])

  const listOrg: (typeof organization)[] = orgs && orgs.length > 0 ? orgs : [organization]

  const handleOrgSwitch = (orgId: string, orgSlug?: string | null) => {
    switchOrganization(orgSlug ?? orgId)
    setPopoverOpen(false)
  }

  const handleSettings = () => {
    push(`/org/${organization?.org_slug ?? organization?.id}/settings`)
    setPopoverOpen(false)
  }

  const handleInviteMembers = () => {
    //workaround for hash change due to layout broken after router.push
    const settingPath = `/org/${organization?.org_slug ?? organization?.id}/settings`
    if (pathname.includes(settingPath)) {
      window.history.pushState(null, '', '#organization-member')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    } else {
      window.location.href = settingPath + '#organization-member'
    }
    setPopoverOpen(false)
  }

  const handleCreateOrg = () => {
    push('/org/create')
    setPopoverOpen(false)
  }
  const isMobile = useIsMobile()

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start" side={'bottom'} sideOffset={8}>
        <div className="flex flex-col">
          {/* Current Organization Section */}
          <div className="px-4 pt-2">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-md bg-[linear-gradient(90deg,#B9AAFF_0.08%,#D6A4AF_98.87%)] flex items-center justify-center shrink-0">
                {organization && profile && (
                  <span className="[&_svg]:w-5 [&_svg]:h-5 text-white">
                    {profile.id === organization.user_id ? <KeyIcon /> : <UsersRound />}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-normal text-s text-primary truncate">{organization?.name}</h3>
                {organization &&
                  'org_members' in organization &&
                  Array.isArray(organization.org_members) && (
                    <p className="text-xs text-slate-500">
                      {t('popover.organization_label')} ·{' '}
                      {t('popover.members_count', { count: organization.org_members.length })}
                    </p>
                  )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {(hasPermission(ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION) ||
                hasPermission(ROLE_PERMISSION_KEYS.MANAGE_MEMBERS)) && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5"
                  onClick={handleSettings}
                >
                  <Settings className="w-3.5 h-3.5" />
                  {t('popover.settings')}
                </Button>
              )}
              {hasPermission(ROLE_PERMISSION_KEYS.MANAGE_MEMBERS) && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5"
                  onClick={handleInviteMembers}
                >
                  <UsersRound className="w-3.5 h-3.5" />
                  {t('popover.invite_members')}
                </Button>
              )}
            </div>
          </div>

          {/* Orgs List */}
          <div className="p-2">
            <div className="px-5 py-2">
              <p className="text-xs font-medium text-slate-500">
                {t('popover.organizations_list')}
              </p>
            </div>

            <div className="space-y-0.5 px-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2Icon className="animate-spin w-4 h-4 text-slate-400" />
                </div>
              ) : (
                listOrg
                  ?.filter((org) => org !== null)
                  ?.map((org) => {
                    const isCurrentOrg =
                      (org.org_slug ?? org.id) === (organization?.org_slug ?? organization?.id)
                    const orgIdentifier = org.org_slug ?? org.id
                    const isManualDefault =
                      orgPref?.is_manual_set && orgPref.default_org_id === orgIdentifier
                    const isHovered = hoveredOrgId === org.id
                    return (
                      <button
                        key={org.id}
                        onClick={() => handleOrgSwitch(org.id, org.org_slug)}
                        onMouseEnter={() => setHoveredOrgId(org.id)}
                        onMouseLeave={() => setHoveredOrgId(null)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-slate-100 transition-colors',
                          isCurrentOrg && 'bg-slate-50'
                        )}
                      >
                        <AnimatePresence initial={false}>
                          {isHovered && !isManualDefault && (
                            <motion.button
                              key="star"
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: 20, opacity: 1 }}
                              exit={{ width: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              onClick={(e) => handleStarClick(e, orgIdentifier)}
                              className="shrink-0 overflow-hidden flex items-center justify-center p-0.5 rounded"
                              title={isManualDefault ? 'Remove default' : 'Set as default'}
                            >
                              <Star
                                className={cn(
                                  'w-3.5 h-3.5 shrink-0',
                                  isManualDefault
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-400'
                                )}
                              />
                            </motion.button>
                          )}
                        </AnimatePresence>
                        <div className="relative w-6 h-6 rounded bg-[linear-gradient(90deg,#B9AAFF_0.08%,#D6A4AF_98.87%)] flex items-center justify-center shrink-0">
                          {org && profile && (
                            <span className="[&_svg]:w-3 [&_svg]:h-3 text-white">
                              {profile.id === org.user_id ? <KeyIcon /> : <UsersRound />}
                            </span>
                          )}
                          {isManualDefault && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                              <Star className="w-2 h-2 fill-amber-400 text-amber-400" />
                            </span>
                          )}
                        </div>
                        <span className="flex-1 text-left truncate text-slate-700">{org.name}</span>
                        {isCurrentOrg && <Check className="w-4 h-4 text-slate-700 shrink-0" />}
                      </button>
                    )
                  })
              )}
            </div>

            <Separator className="my-2" />

            {/* Create Organization */}
            <div className="flex items-center gap-2">
              <button
                onClick={!isMaxOrg && !isLoading ? handleCreateOrg : undefined}
                disabled={isMaxOrg || isLoading}
                className={cn(
                  'flex flex-1 items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors text-slate-600',
                  isMaxOrg || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'
                )}
              >
                <PlusIcon className="w-4 h-4" />
                <span>{t('popover.create_organization')}</span>
              </button>
              {isMaxOrg && (
                <button
                  onClick={() => window.open(PRICING_URL, '_blank')}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-slate-200 shrink-0 hover:bg-slate-50 transition-colors"
                >
                  <Rocket className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                    {t('popover.upgrade_plan')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
