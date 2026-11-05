'use client'

import { CustomTable } from '@/shared/components/customize/table/custom-table'
import { TableActionProvider } from '@/shared/providers/table-action-provider'
import { useParams } from 'next/navigation'
import { Suspense, useRef, useState, useMemo } from 'react'
import { DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { useGetCustomDomains, useGetDefaultDomains } from '@/features/custom-domains/hooks/queries'
import {
  DeleteDomainAction,
  VerifyDomainAction,
  unifiedDomainColumns,
  UnifiedDomain,
} from './table/columns'
import { Button } from '@/shared/components/ui/button'
import { AddCustomDomainStepper } from './add-stepper/add-stepper'
import { DomainSelectionModal } from './domain-selection-modal'
import { ClaimSubdomainDialog } from './claim-subdomain-dialog'
import { useSetDefaultDomain } from '@/features/custom-domains/hooks/mutations'
import React from 'react'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { PlusIcon, Check, StarIcon, Smartphone } from 'lucide-react'
import { DeepLinkConfigPanel } from './deep-link-config-panel'
import { DeepLinkVerificationBadge } from './deep-link-verification-badge'
import { DeepLinkAnalyticsLink } from './deep-link-analytics-link'
import { usePlanFeatures } from '@/features/touch-points/hooks/use-plan-features'
import type { CustomDomain } from '@/features/custom-domains/hooks/queries'
import { useTranslation } from 'react-i18next'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { Badge } from '@/shared/components/ui/badge'
// import { useUpdateOrganization } from '@/features/organizations/hooks/mutations/mutations'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import Image from 'next/image'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { useIsTablet } from '@/shared/hooks/use-mobile'
import { UserRoundCog, MoreHorizontal } from 'lucide-react'
import GlobeShieldIcon from '@/shared/components/icons/globe-shield'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { TableActionContext } from '@/shared/providers/table-action-provider'

// Domain Card Component for Mobile View
// TODO: Refactor to separate file if it grows more complex
const DomainCard = ({
  domain,
  onSetDefault,
  isSettingDefault,
}: {
  domain: UnifiedDomain
  onSetDefault?: (domain: UnifiedDomain) => void
  isSettingDefault?: boolean
}) => {
  const { t } = useTranslation(['domain', 'common'])
  const tableActionContext = React.useContext(TableActionContext)
  const actions = tableActionContext?.actions
  const customDomain = domain._type === 'custom' ? (domain as any) : null
  const defaultDomain = domain._type === 'default' ? (domain as any) : null
  const domainName = customDomain?.domain || defaultDomain?.name

  const CF_GENERATING_STATUSES = ['generating_ssl', 'initializing', 'pending_validation', 'pending_issuance', 'pending_deployment']

  // Determine status
  const isVerified = domain._type === 'default' || customDomain?.is_verified
  const isFailed = customDomain?.last_failed_at && (customDomain?.is_failed ?? 0) >= 8
  const isGeneratingSsl =
    !!customDomain?.cf_hostname_id &&
    !customDomain?.is_verified &&
    !!customDomain?.last_failed_reason &&
    CF_GENERATING_STATUSES.includes(customDomain.last_failed_reason)

  let statusBadge
  if (isVerified) {
    statusBadge = (
      <Badge
        size={'xs'}
        className="cursor-default bg-green-50 text-green-800 not-italic hover:bg-green-50"
      >
        {t('domain:statusBadge.verified')}
      </Badge>
    )
  } else if (isFailed) {
    statusBadge = (
      <Badge
        size={'xs'}
        className="cursor-default bg-red-50 text-red-800 not-italic hover:bg-red-50"
      >
        {t('domain:statusBadge.failed')}
      </Badge>
    )
  } else if (isGeneratingSsl) {
    statusBadge = (
      <Badge
        size={'xs'}
        className="cursor-default bg-blue-50 text-blue-700 not-italic hover:bg-blue-50"
      >
        {t('domain:statusBadge.generatingSsl')}
      </Badge>
    )
  } else {
    statusBadge = (
      <Badge
        size={'xs'}
        className="cursor-default bg-yellow-50 text-yellow-800 not-italic hover:bg-yellow-50"
      >
        {t('domain:statusBadge.verifying')}
      </Badge>
    )
  }

  return (
    <div className="bg-background rounded-lg px-2 py-4 flex gap-1.5 items-center">
      {/* Icon */}
      <div className="bg-slate-50 rounded size-9 flex items-center justify-center shrink-0">
        {domain._type === 'custom' ? (
          <UserRoundCog className="w-6 h-6 text-slate-400" />
        ) : (
          <GlobeShieldIcon className="w-6 h-6 text-slate-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 px-2">
        <div className="flex gap-2 items-center py-0.5">
          <span className="font-semibold text-base text-[#081842] truncate">{domainName}</span>
          {statusBadge}
          {customDomain &&
            customDomain.is_verified &&
            !customDomain.is_subdomain_claimed && (
              <DeepLinkVerificationBadge domain={customDomain as CustomDomain} />
            )}
        </div>
        {customDomain &&
          customDomain.is_verified &&
          !customDomain.is_subdomain_claimed &&
          !customDomain.is_default && (
            <div className="mt-2">
              <DeepLinkAnalyticsLink />
            </div>
          )}
        {domain._isDefault && (
          <div className="flex gap-1 items-center">
            <StarIcon className="w-4.5 h-4.5 fill-amber-400" strokeWidth={0} />
            <span className="text-sm text-slate-500">{t('common:label.default_domain')}</span>
          </div>
        )}
      </div>

      {/* Actions Menu */}
      {(() => {
        const hasCustomActions = domain._type === 'custom' && actions && actions.length > 0
        const canSetDefault = onSetDefault && !domain._isDefault && isVerified
        const showMenu = hasCustomActions || canSetDefault

        if (!showMenu) return null

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 border-slate-300 rounded-lg shrink-0"
              >
                <MoreHorizontal className="h-4.5 w-4.5 text-slate-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Set as Default action - Available for both custom and system domains */}
              {canSetDefault && (
                <DropdownMenuItem
                  onClick={() => onSetDefault(domain)}
                  disabled={isSettingDefault}
                  className={`w-full justify-between shadow-none border-none relative flex cursor-default font-medium h-auto
     select-none items-center gap-2 rounded-sm px-2 py-1.5 transition-colors 
     focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0
     text-sm leading-[20px] text-slate-500`}
                >
                  {t('domain:column.setAsDefault')}
                  <StarIcon className="h-4 w-4 opacity-60" />
                </DropdownMenuItem>
              )}

              {/* Other actions from TableActionProvider - Only for custom domains */}
              {domain._type === 'custom' &&
                actions?.map((action) => {
                  if (!action.render) return null
                  const content = action.render({ original: domain } as any)
                  if (!content) return null
                  return (
                    <DropdownMenuItem key={action.name} asChild>
                      {content}
                    </DropdownMenuItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })()}
    </div>
  )
}

export const CustomDomains = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const { data: customDomains, isLoading: isLoadingCustom } = useGetCustomDomains(org_id)
  const { data: defaultDomains = [], isLoading: isLoadingDefault } = useGetDefaultDomains(org_id)
  const { mutate: setDefaultDomain, isPending: updatingDefaultDomain } = useSetDefaultDomain(org_id)
  const { organization } = useOrganizationStore()
  const isTablet = useIsTablet()
  const addDomainRef = useRef<DialogCustomRef>(null)
  const domainSelectionRef = useRef<DialogCustomRef>(null)
  const claimSubdomainRef = useRef<DialogCustomRef>(null)

  const { orgPlan } = useOrganizationStoreProvider()
  const canAddDomain = React.useMemo(() => {
    if (orgPlan) {
      return orgPlan.max_domains_per_org > 0
    }
    return false
  }, [orgPlan])

  // Merge custom and default domains into unified format
  const unifiedDomains = useMemo(() => {
    const merged: UnifiedDomain[] = []

    // Add custom domains
    customDomains?.data?.forEach((domain) => {
      merged.push({
        ...domain,
        _type: 'custom',
        _isDefault: organization?.default_domain_id === domain.id,
      })
    })

    // Add default domains
    defaultDomains?.forEach((domain) => {
      merged.push({
        ...domain,
        _type: 'default',
        _isDefault:
          organization?.default_domain_id === domain.id ||
          (!organization?.default_domain_id && domain.default_selected) ||
          false,
      })
    })

    return merged
  }, [customDomains?.data, defaultDomains, organization?.default_domain_id])

  const [dialogSize, setDialogSize] = useState<'lg' | 'md' | 'sm'>('sm')
  const [dialogTitle, setDialogTitle] = useState<string>('Add domain')
  const [dialogDescription, setDialogDescription] = useState<string>(
    'Add the domain to your organization'
  )
  const { t } = useTranslation(['setting', 'domain', 'common'])

  // Deep link config dialog state. `deepLinkDomain` is the row being configured;
  // `deepLinkOpen` is the dialog visibility. Cleared when the dialog closes so the
  // form state resets for the next row.
  const [deepLinkDomain, setDeepLinkDomain] = useState<CustomDomain | null>(null)
  const [deepLinkOpen, setDeepLinkOpen] = useState(false)

  const handleConfigureDeepLink = (domain: CustomDomain) => {
    setDeepLinkDomain(domain)
    setDeepLinkOpen(true)
  }

  const handleSetDefaultDomain = (row: UnifiedDomain) => {
    if (row._type === 'custom') {
      setDefaultDomain((row as any).id)
    } else if (row._type === 'default') {
      setDefaultDomain((row as any).id)
    }
  }

  const columns = unifiedDomainColumns(handleSetDefaultDomain, updatingDefaultDomain)

  const { enableDeepLinkAttribution } = usePlanFeatures()

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Section with Illustration */}
      <div className="flex flex-col gap-4">
        {/* Title & Button */}
        <div className="flex flex-col gap-4 lg:justify-between lg:flex-row">
          <div>
            <h2 className="text-l font-semibold text-slate-700">{t('domain:hero.title')}</h2>
            <p className="text-slate-500 font-normal">{t('domain:hero.subtitle')}</p>
          </div>
          <div>
            {/* Domain Selection Modal */}
            <CustomDialogV2
              title={t('domain:domainSelection.title')}
              description={t('domain:domainSelection.subtitle')}
              size="md"
              button={
                <Button
                  variant="default"
                  className="gap-1"
                  onClick={() => domainSelectionRef.current?.open?.()}
                  disabled={!canAddDomain}
                  iconLeft={<PlusIcon />}
                >
                  {t('common:buttons.add', {
                    field: t('common:module.domain'),
                  })}{' '}
                  {!canAddDomain && (
                    <span className="text-guest-secondary-default">(Plan limit)</span>
                  )}
                </Button>
              }
              ref={domainSelectionRef}
            >
              {({ setOpen }) => (
                <DomainSelectionModal
                  onSelectCustomDomain={() => {
                    setOpen(false)
                    setTimeout(() => addDomainRef.current?.open?.(), 100)
                  }}
                  onSelectSubdomain={() => {
                    setOpen(false)
                    setTimeout(() => claimSubdomainRef.current?.open?.(), 100)
                  }}
                />
              )}
            </CustomDialogV2>

            {/* Add Custom Domain Modal */}
            <CustomDialogV2
              title={dialogTitle}
              description={dialogDescription}
              size={dialogSize}
              button={<></>}
              ref={addDomainRef}
            >
              {({ setOpen }) => (
                <Suspense fallback={<SkeletonCard className="w-[600px] h-[500px]" />}>
                  <AddCustomDomainStepper
                    setDialogTitle={setDialogTitle}
                    setDialogDescription={setDialogDescription}
                    setDialogSize={setDialogSize}
                    onFinish={() => setOpen(false)}
                  />
                </Suspense>
              )}
            </CustomDialogV2>

            {/* Claim Subdomain Modal */}
            <CustomDialogV2
              title={t('domain:claimSubdomain.title')}
              description={t('domain:claimSubdomain.subtitle')}
              size="md"
              button={<></>}
              ref={claimSubdomainRef}
            >
              {({ setOpen }) => (
                <Suspense fallback={<SkeletonCard className="w-[400px] h-[400px]" />}>
                  <ClaimSubdomainDialog onFinish={() => setOpen(false)} />
                </Suspense>
              )}
            </CustomDialogV2>
          </div>
        </div>

        {/* Image and main content */}
        <div className="bg-card rounded-2xl p-6">
          <div className="flex flex-col items-center gap-12 lg:items-start xl:flex-row">
            {/* Illustration Section */}
            <Image
              src="/images/custom_domain_illustration.png"
              alt="Custom Domain Illustration"
              width={420}
              height={142}
              className="object-contain relative z-10"
              priority
              quality={100}
            />

            {/* Content Section */}
            <div className="flex items-center">
              {/* Benefits List */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-slate-700 font-semibold text-sm">
                      {t('domain:hero.benefit_1_title')}
                    </p>
                    <p className="text-slate-500 font-normal text-xs">
                      {t('domain:hero.benefit_1_subtitle')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-slate-700 font-semibold text-sm">
                      {t('domain:hero.benefit_2_title')}
                    </p>
                    <p className="text-slate-500 font-normal text-xs">
                      {t('domain:hero.benefit_2_subtitle')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-slate-700 font-semibold text-sm">
                      {t('domain:hero.benefit_3_title')}
                    </p>
                    <p className="text-slate-500 font-normal text-xs">
                      {t('domain:hero.benefit_3_subtitle')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TableActionProvider
        actions={[
          {
            name: t('common:buttons.verify', { field: '' }),
            label: t('common:buttons.verify', {
              field: t('common:module.domain'),
            }),
            render: (row) => {
              if (row.original._type === 'custom' && !row.original.is_verified) {
                return <VerifyDomainAction row={row.original as any} />
              }
              return null
            },
          },
          {
            name: 'configure-deep-link',
            label: t('domain:deepLink.configureButton'),
            render: (row) => {
              // Deep links require a custom, verified, non-subdomain-claimed row.
              // Claimed free subdomains (kei.dev.li2.link etc.) live on li2
              // infrastructure so customer apps shouldn't entitle against them —
              // see deep-links-spec §5.0 for the full eligibility rule.
              if (row.original._type !== 'custom') return null
              const customRow = row.original as unknown as CustomDomain
              if (!customRow.is_verified) return null
              if (customRow.is_subdomain_claimed) return null
              return (
                <button
                  type="button"
                  onClick={() => handleConfigureDeepLink(customRow)}
                  className="flex w-full justify-between cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium leading-5 text-slate-500 transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {t('domain:deepLink.configureButton')}
                  <Smartphone className="h-4 w-4 opacity-60" />
                </button>
              )
            },
          },
          {
            name: 'delete',
            label: t('common:buttons.delete', {
              field: t('common:module.domain'),
            }),
            render: (row) => {
              if (row.original._type === 'custom') {
                return <DeleteDomainAction row={row.original as any} />
              }
              return null
            },
          },
        ]}
      >
        <div>
          <div className="mb-4">
            <h2 className="text-l font-semibold text-slate-700">{t('domain:table.title')}</h2>
            <p className="text-slate-500 font-normal">{t('domain:table.subtitle')}</p>
          </div>
          {!isTablet ? (
            <div className="bg-card rounded-2xl p-6">
              <CustomTable
                enableSpacing={false}
                columns={columns}
                data={unifiedDomains}
                rowCount={unifiedDomains.length}
                isLoading={isLoadingCustom || isLoadingDefault}
                enableColumnToggle={false}
                enableTableTool={false}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Custom Domains Section */}
              {unifiedDomains.filter((d) => d._type === 'custom').length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-1 items-center">
                    <UserRoundCog className="w-3 h-3 text-slate-500" />
                    <span className="text-xs text-slate-500">{t('domain:tabs.customDomains')}</span>
                  </div>
                  <div className="space-y-3">
                    {unifiedDomains
                      .filter((d) => d._type === 'custom')
                      .map((domain) => (
                        <DomainCard
                          key={(domain as any).id}
                          domain={domain}
                          onSetDefault={handleSetDefaultDomain}
                          isSettingDefault={updatingDefaultDomain}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* System Default Domains Section */}
              {unifiedDomains.filter((d) => d._type === 'default').length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-1 items-center">
                    <GlobeShieldIcon className="w-3 h-3 text-slate-500" />
                    <span className="text-xs text-slate-500">
                      {t('domain:tabs.systemDefaultDomains')}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {unifiedDomains
                      .filter((d) => d._type === 'default')
                      .map((domain) => (
                        <DomainCard
                          key={(domain as any).id}
                          domain={domain}
                          onSetDefault={handleSetDefaultDomain}
                          isSettingDefault={updatingDefaultDomain}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {(isLoadingCustom || isLoadingDefault) && (
                <div className="space-y-3">
                  <SkeletonCard className="h-20" />
                  <SkeletonCard className="h-20" />
                </div>
              )}

              {/* Empty State */}
              {!isLoadingCustom && !isLoadingDefault && unifiedDomains.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  {t('domain:defaultDomains.tableEmpty')}
                </div>
              )}
            </div>
          )}
        </div>
      </TableActionProvider>

      {deepLinkDomain && (
        <DeepLinkConfigPanel
          domain={deepLinkDomain}
          open={deepLinkOpen}
          onOpenChange={(open) => {
            setDeepLinkOpen(open)
            if (!open) setDeepLinkDomain(null)
          }}
        />
      )}
    </div>
  )
}
