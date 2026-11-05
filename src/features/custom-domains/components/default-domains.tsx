'use client'

import { CustomTable } from '@/shared/components/customize/table/custom-table'
import { useGetDefaultDomains } from '@/features/custom-domains/hooks/queries'
import { Badge } from '@/shared/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Globe, Lock, StarIcon, Zap } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { ColumnDef } from '@tanstack/react-table'
import { useParams } from 'next/navigation'
import { DataTableRowActions } from '@/shared/components/customize/table/data-table-row-action'
import { TableActionProvider } from '@/shared/providers/table-action-provider'
import { SetDefaultDomainAction } from './table/columns'
import { useUpdateOrganization } from '@/features/organizations/hooks/mutations/mutations'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'
import { useSetDefaultDomain } from '../hooks/mutations'

export const DefaultDomains = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const { data: domains = [], isLoading } = useGetDefaultDomains(org_id)
  const { t } = useTranslation(['domain', 'common'])
  const { mutate: setDefaultDomain, isPending: updatingDefaultDomain } = useSetDefaultDomain(org_id)
  const { organization } = useOrganizationStore()

  // Type for the dropdown domains returned by the API

  const columns: ColumnDef<DropdownData<'domains'>[number]>[] = [
    {
      accessorKey: 'name',
      header: t('domain:column.domain'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium flex gap-1 items-center">
            {organization?.default_domain_id === row.original.id ||
            (!organization?.default_domain_id && row.original.default_selected) ? (
              <StarIcon className="size-4 fill-amber-400" strokeWidth={0} />
            ) : (
              <Globe className="w-4 h-4 text-muted-foreground" />
            )}
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'is_default',
      header: t('domain:column.is_verified'),
      cell: () => (
        <Badge variant="default" className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="w-3 h-3" />
          {t('domain:statusBadge.verified')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        return (
          <div className="flex gap-2">
            <DataTableRowActions key={`row-action-${row.original.id}`} row={row} />
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Info Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              {t('domain:defaultDomains.availableToAll')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              No plan restrictions or verification required
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-600" />
              {t('domain:defaultDomains.noDnsRequired')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">Pre-verified and ready to use</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              {t('domain:defaultDomains.instantUse')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Start creating short links immediately
            </CardDescription>
          </CardContent>
        </Card>
      </div> */}

      <TableActionProvider
        actions={[
          {
            name: 'setDefault',
            label: t('domain:actions.setDefault'),
            render: (row) => (
              <SetDefaultDomainAction
                row={row.original}
                action={(row, options) => setDefaultDomain(row.id, options)}
                isLoading={updatingDefaultDomain}
              />
            ),
          },
        ]}
      >
        {/* Default Domains Table */}
        <CustomTable
          enableSpacing={false}
          className="bg-background rounded-2xl"
          columns={columns}
          data={domains}
          rowCount={domains.length}
          isLoading={isLoading}
          enableColumnToggle={false}
          enableTableTool={false}
        />
      </TableActionProvider>
    </div>
  )
}
