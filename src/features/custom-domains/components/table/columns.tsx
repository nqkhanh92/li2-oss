import { useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import type { CellContext, Column, ColumnDef } from '@tanstack/react-table'
import { CustomDomain } from '@/app/api/organizations/[org_id]/custom-domains/route'
import { DeepLinkVerificationBadge } from '../deep-link-verification-badge'
import { DeepLinkAnalyticsLink } from '../deep-link-analytics-link'
import type { CustomDomain as FeatureCustomDomain } from '@/features/custom-domains/hooks/queries'
import { parseDeepLinkConfig } from '@/shared/schemas/custom-domains'
import { DataTableColumnHeader } from '@/shared/components/customize/table/column-header'
import { DataTableRowActions } from '@/shared/components/customize/table/data-table-row-action'
import { Button } from '@/shared/components/ui/button'
import {
  CalendarIcon,
  StarIcon,
  Trash2,
  VerifiedIcon,
  UserRoundCog,
  GiftIcon,
  Loader2,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { CooldownButton } from '@/shared/components/customize/cooldown-button'
import { VerifyDomainStepper } from '../add-stepper/add-stepper'
import { Badge } from '@/shared/components/ui/badge'
import { useGetTouchPointByCustomDomain } from '@/features/custom-domains/hooks/queries'
import { useDeleteCustomDomain } from '@/features/custom-domains/hooks/mutations'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { useTranslation } from 'react-i18next'
import { useDomainStore } from '@/shared/stores/domain-stepper-store'
import { useDayjs } from '@/shared/hooks/use-dayjs'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'
import GlobeShieldIcon from '@/shared/components/icons/globe-shield'

// Unified domain type for display — used by unifiedDomainColumns below.
export type UnifiedDomain = (CustomDomain | DropdownData<'domains'>[number]) & {
  _type: 'custom' | 'default'
  _isDefault?: boolean
}

// ============================================================================
// Header components
// ============================================================================
// TanStack Table's column `header` and `cell` slots are called from inside
// React render — any hook calls they make would normally be fine, but they
// need to live inside a PascalCase component for eslint's react-hooks rule
// to recognize them. These small wrappers let the column definitions stay as
// pure data while the hook calls happen inside proper components.

function TranslatedColumnHeader<T>({
  column,
  tKey,
  className,
}: {
  column: Column<T, unknown>
  tKey: string
  className?: string
}) {
  const { t } = useTranslation('domain')
  return <DataTableColumnHeader column={column} title={t(tKey)} className={className} />
}

function CenterHeader({ tKey }: { tKey: string }) {
  const { t } = useTranslation('domain')
  return <div className="flex justify-center text-s font-medium text-slate-500">{t(tKey)}</div>
}

function PlainTextHeader({ tKey }: { tKey: string }) {
  const { t } = useTranslation('domain')
  return <>{t(tKey)}</>
}

// ============================================================================
// Shared badge helpers
// ============================================================================

function VerifyingBadge({ phase, domain }: { phase: 1 | 2; domain?: string }) {
  const { t } = useTranslation('domain')
  const label = phase === 1 ? t('statusBadge.verifying') : t('statusBadge.generatingSsl')
  const tooltip =
    phase === 1
      ? t('statusBadge.verifyingPhase1Tooltip')
      : t('statusBadge.verifyingPhase2Tooltip', { domain })
  const badgeClass =
    phase === 1
      ? 'cursor-default bg-yellow-50 text-yellow-800 not-italic hover:bg-yellow-50'
      : 'cursor-default bg-blue-50 text-blue-700 not-italic hover:bg-blue-50'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger type="button" className="cursor-default">
          <Badge size="xs" className={badgeClass}>
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-center">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// Cell components — customDomainColumns
// ============================================================================

const CF_GENERATING_STATUSES = ['generating_ssl', 'initializing', 'pending_validation', 'pending_issuance', 'pending_deployment']

function DomainNameCell({ row }: CellContext<CustomDomain, unknown>) {
  const { organization } = useOrganizationStore()
  return (
    <div className="flex gap-2 items-center">
      {organization?.default_domain_id === row.id && (
        <StarIcon className="size-4 fill-amber-400" strokeWidth={0} />
      )}
      {row.original.domain}
    </div>
  )
}

function CustomDomainStatusCell({ row }: CellContext<CustomDomain, unknown>) {
  const { t } = useTranslation('domain')
  if (row.original.is_verified) {
    return (
      <Badge size={'xs'} variant={'success'}>
        {t('statusBadge.verified')}
      </Badge>
    )
  }
  if (row.original.last_failed_at && row.original.is_failed >= 8) {
    return (
      <CustomDialogV2
        size="xl"
        button={
          <Badge size={'xs'} className="cursor-pointer" variant={'destructive'}>
            {t('statusBadge.failed')}
          </Badge>
        }
        title={t('common:buttons.verification', { field: t('common:status.failed') })}
      >
        {({ setOpen }: { setOpen: (open: boolean) => void }) => (
          <VerifyDomainStepper domainId={row.id} onFinish={() => setOpen(false)} />
        )}
      </CustomDialogV2>
    )
  }
  const isGeneratingSsl =
    !!row.original.cf_hostname_id &&
    !row.original.is_verified &&
    !!row.original.last_failed_reason &&
    CF_GENERATING_STATUSES.includes(row.original.last_failed_reason)
  if (isGeneratingSsl) {
    return <VerifyingBadge phase={2} domain={row.original.domain} />
  }
  return <VerifyingBadge phase={1} domain={row.original.domain} />
}

function CreatedAtCell({ row }: CellContext<CustomDomain, unknown>) {
  const { dayjs } = useDayjs()
  return (
    <div className="flex gap-2 items-center text-gray-50">
      <CalendarIcon className="w-4 h-4" />
      {dayjs(row.original.created_at).format('MMMM DD, YYYY')}
    </div>
  )
}

// ============================================================================
// Cell components — unifiedDomainColumns
// ============================================================================

function UnifiedDomainNameCell({ row }: CellContext<UnifiedDomain, unknown>) {
  const asCustom = ['custom', 'claimed'].includes(row.original._type)
    ? (row.original as CustomDomain)
    : null
  const asDefault =
    row.original._type === 'default' ? (row.original as DropdownData<'domains'>[number]) : null
  return (
    <div className="flex gap-2 items-center">
      {row.original._isDefault && <StarIcon className="size-4 fill-amber-400" strokeWidth={0} />}
      <span className="font-medium text-s">{asCustom?.domain || asDefault?.name}</span>
    </div>
  )
}

function DomainTypeCell({ row }: CellContext<UnifiedDomain, unknown>) {
  const { t } = useTranslation('domain')
  if ((row.original as CustomDomain).is_subdomain_claimed) {
    return (
      <div className="flex gap-1 items-center">
        <GiftIcon className="w-4.5 h-4.5 text-slate-400" />
        <span className="text-s font-normal text-slate-700">{t('labels.claimed')}</span>
      </div>
    )
  }
  if (row.original._type === 'custom') {
    return (
      <div className="flex gap-1 items-center">
        <UserRoundCog className="w-4.5 h-4.5 text-slate-400" />
        <span className="text-s font-normal text-slate-700">{t('labels.custom')}</span>
      </div>
    )
  }
  return (
    <div className="flex gap-1 items-center">
      <GlobeShieldIcon className="w-4.5 h-4.5 text-slate-400" />
      <span className="text-s font-normal text-slate-700 ">{t('labels.systemDefault')}</span>
    </div>
  )
}

function UnifiedStatusCell({ row }: CellContext<UnifiedDomain, unknown>) {
  const { t } = useTranslation('domain')
  const { _type } = row.original
  const customDomain = ['custom', 'claimed'].includes(_type)
    ? (row.original as CustomDomain)
    : null

  // Default domains are always verified
  const isVerified = _type === 'default' || customDomain?.is_verified
  const isFailed = customDomain?.last_failed_at && (customDomain?.is_failed ?? 0) >= 8
  const isGeneratingSsl =
    !!customDomain?.cf_hostname_id &&
    !customDomain?.is_verified &&
    !!customDomain?.last_failed_reason &&
    CF_GENERATING_STATUSES.includes(customDomain.last_failed_reason)

  if (isVerified) {
    return (
      <div className="flex justify-center items-center gap-2">
        <Badge
          size={'xs'}
          className="cursor-default bg-green-50 text-green-800 not-italic hover:bg-green-50"
        >
          {t('statusBadge.verified')}
        </Badge>
        {customDomain && customDomain.is_verified && !customDomain.is_subdomain_claimed && (
          <DeepLinkVerificationBadge domain={customDomain as FeatureCustomDomain} />
        )}
      </div>
    )
  }

  if (isFailed) {
    return (
      <div className="flex justify-center">
        <Badge
          size={'xs'}
          className="cursor-default bg-red-50 text-red-800 not-italic hover:bg-red-50"
        >
          {t('statusBadge.failed')}
        </Badge>
      </div>
    )
  }

  if (isGeneratingSsl) {
    return (
      <div className="flex justify-center">
        <VerifyingBadge phase={2} domain={customDomain?.domain} />
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <VerifyingBadge phase={1} domain={customDomain?.domain} />
    </div>
  )
}

// ============================================================================
// Column definitions
// ============================================================================

export const customDomainColumns: ColumnDef<CustomDomain>[] = [
  {
    accessorKey: 'domain',
    header: ({ column }) => <TranslatedColumnHeader column={column} tKey="column.domain" />,
    enableSorting: false,
    cell: DomainNameCell,
    size: 400,
  },
  {
    accessorKey: 'is_verified',
    header: ({ column }) => (
      <TranslatedColumnHeader column={column} tKey="column.verification_status" />
    ),
    enableSorting: false,
    cell: CustomDomainStatusCell,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <TranslatedColumnHeader column={column} tKey="column.created_at" />,
    enableSorting: true,
    cell: CreatedAtCell,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.is_verified && !row.original.is_subdomain_claimed && !parseDeepLinkConfig(row.original.deep_link_apps)?.enabled && (
          <DeepLinkAnalyticsLink />
        )}
        <DataTableRowActions key={`row-action-${row.original.id}`} row={row} />
      </div>
    ),
  },
]

// Factory because these columns close over `onSetDefault` and `isSettingDefault`.
// No hooks called at this level — all translation/store hooks live inside the
// extracted header and cell components above.
export const unifiedDomainColumns = (
  onSetDefault?: (row: UnifiedDomain) => void,
  isSettingDefault?: boolean
): ColumnDef<UnifiedDomain>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <TranslatedColumnHeader
        column={column}
        tKey="column.domain"
        className="text-s font-medium text-slate-500"
      />
    ),
    enableSorting: false,
    cell: UnifiedDomainNameCell,
    size: 300,
  },
  {
    accessorKey: '_type',
    header: ({ column }) => (
      <TranslatedColumnHeader
        column={column}
        tKey="column.type"
        className="text-s font-medium text-slate-500"
      />
    ),
    enableSorting: false,
    cell: DomainTypeCell,
  },
  {
    accessorKey: 'is_verified',
    header: () => <CenterHeader tKey="column.verification_status" />,
    enableSorting: false,
    cell: UnifiedStatusCell,
  },
  {
    id: 'setDefault',
    header: () => <CenterHeader tKey="column.setAsDefault" />,
    cell: ({ row }) => {
      const { _type } = row.original
      const customDomain = ['custom', 'claimed'].includes(_type)
        ? (row.original as CustomDomain)
        : null
      const isVerified = _type === 'default' || !!customDomain?.is_verified
      return (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.original._isDefault}
            onCheckedChange={() => onSetDefault?.(row.original)}
            disabled={!row.original._isDefault && (isSettingDefault || !isVerified)}
            className="size-4.5 rounded-full data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 [&>span>svg]:w-[11px] [&>span>svg]:h-[11px] [&>span>svg]:stroke-4"
          />
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: () => <PlainTextHeader tKey="column.actions" />,
    cell: ({ row }) => {
      if (row.original._type !== 'custom') return null
      const custom = row.original as unknown as CustomDomain
      return (
        <div className="flex items-center gap-2">
          {custom.is_verified && !custom.is_subdomain_claimed && !parseDeepLinkConfig(custom.deep_link_apps)?.enabled && (
            <DeepLinkAnalyticsLink />
          )}
          <DataTableRowActions key={`row-action-${row.original.id}`} row={row} />
        </div>
      )
    },
  },
]

// ============================================================================
// Row action components (exported for use in TableActionProvider)
// ============================================================================

type ActionProps = {
  row: CustomDomain
  isLoading?: boolean
  action?: (
    row: CustomDomain,
    options?: { onSuccess?: () => void; onError?: () => void }
  ) => void | Promise<void>
}

export const SetDefaultDomainAction = ({ row, isLoading, action }: ActionProps) => {
  const { t } = useTranslation('domain')
  const { organization } = useOrganizationStore()

  const handleClick = async () => {
    action?.(row)
  }

  const isDefaultOrgDomain = organization?.default_domain_id === row.id
  const isNotVerified = !row.is_verified && !row.is_default
  const isDefaultSelectedDomain = !organization?.default_domain_id && !!row.default_selected

  const disabled = isDefaultOrgDomain || isNotVerified || isDefaultSelectedDomain
  return (
    <LoadingButton
      onClick={handleClick}
      isLoading={isLoading}
      disabled={disabled}
      variant="ghost"
      className="w-full justify-between relative flex cursor-default font-medium h-auto
     select-none items-center gap-2 rounded-sm px-2 py-1.5 transition-colors
     text-sm leading-5 text-slate-500
     hover:bg-accent hover:text-accent-foreground
     data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0"
    >
      {t('domain:actions.setDefault')}
      <StarIcon />
    </LoadingButton>
  )
}

export const DeleteDomainAction = ({ row }: { row: CustomDomain }) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('setting')
  const [isDeleting, setIsDeleting] = useState(false)
  const { mutateAsync: deleteDomain } = useDeleteCustomDomain(org_id)
  const { data, isLoading: isLoadingTouchPoint } = useGetTouchPointByCustomDomain(org_id, row.id)
  const touchPoints = data?.data ?? []
  return (
    <CustomDialogV2
      size="sm"
      title={t('common:buttons.delete', { field: t('common:module.domain') })}
      button={
        <Button
          variant="ghost"
          className="w-full justify-between relative flex cursor-default font-medium h-auto
     select-none items-center gap-2 rounded-sm px-2 py-1.5 transition-colors
     text-sm leading-5 text-slate-500
     hover:bg-accent hover:text-accent-foreground
     data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0"
          size="sm"
          iconRight={<Trash2 className="opacity-60" />}
        >
          {t('common:buttons.delete', { field: '' })}
        </Button>
      }
    >
      {({ setOpen }: { setOpen: (open: boolean) => void }) => (
        <div>
          <p>
            {t('common:messages.delete_dialog', {
              field: t('common:module.domain'),
            })}
          </p>
          {isLoadingTouchPoint ? (
            <div className="w-full min-h-[60px] flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : touchPoints.length > 0 ? (
            <div className="mt-3">
              <span className="text-sm text-muted-foreground">
                These touch points will be updated to use default domain
              </span>
              <div className="my-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Short Link (Before)</TableHead>
                      <TableHead>Short Link (After)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {touchPoints.map((touchPoint) => (
                      <TableRow key={touchPoint.id}>
                        <TableCell>{touchPoint.name}</TableCell>
                        <TableCell>{`${row.domain}/${
                          touchPoint.slug || touchPoint.short_code
                        }`}</TableCell>
                        <TableCell>
                          {data?.default_domain
                            ? `${data.default_domain}/${touchPoint.slug || touchPoint.short_code}`
                            : `${process.env.NEXT_PUBLIC_SHORT_LINK_URL}/${
                                touchPoint.slug || touchPoint.short_code
                              }`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              className="gap-1.5 text-slate-600"
            >
              {t('common:buttons.cancel')}
            </Button>
            <LoadingButton
              variant="destructive"
              isLoading={isDeleting}
              disabled={isLoadingTouchPoint || isDeleting}
              onClick={async () => {
                setIsDeleting(true)
                try {
                  await deleteDomain(row.id)
                  setOpen(false)
                } catch {
                  setIsDeleting(false)
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              {t('common:buttons.delete', { field: '' })}
            </LoadingButton>
          </div>
        </div>
      )}
    </CustomDialogV2>
  )
}

export const VerifyDomainAction = ({ row }: { row: CustomDomain }) => {
  const cooldownUntil = useDomainStore((state) => state.cooldownUntil)
  const { t } = useTranslation('domain')
  return (
    <CustomDialogV2
      size="lg"
      className="space-y-6"
      description={t('forms.verifyDomainStep.description')}
      title={t('forms.verifyDomainStep.title')}
      button={
        <CooldownButton
          variant="ghost"
          cooldownUntil={cooldownUntil}
          className="w-full justify-between relative flex cursor-default font-medium h-auto
     select-none items-center gap-2 rounded-sm px-2 py-1.5 transition-colors
     text-sm leading-5 text-slate-500
     hover:bg-accent hover:text-accent-foreground
     data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0"
          size="sm"
        >
          {t('common:buttons.verify', { field: '' })}
          <VerifiedIcon className="h-4 w-4 opacity-60" />
        </CooldownButton>
      }
    >
      {({ setOpen }: { setOpen: (open: boolean) => void }) => (
        <VerifyDomainStepper domainId={row.id} onFinish={() => setOpen(false)} />
      )}
    </CustomDialogV2>
  )
}
