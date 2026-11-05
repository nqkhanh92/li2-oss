'use client'
import { useFilters } from '@/shared/hooks/use-filters'
import {
  EyeIcon,
  EyeOffIcon,
  FileSpreadsheetIcon,
  GlobeIcon,
  KeyIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PenLineIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { LoadingButton } from '../../../../shared/components/customize/loading-button'
import { useParams } from 'next/navigation'
import {
  CustomDialog,
  DialogCustomRef,
} from '../../../../shared/components/customize/custom-dialog'
import { useGetIntegrations } from '@/features/integrations/hooks/queries'
import {
  useBulkDeleteIntegration,
  useCreateIntegration,
  useUpdateIntegration,
} from '@/features/integrations/hooks/mutations'
import { IntegrationForm } from '../form/integration-form'
import { IntegrationType, mappingIntegrationType } from '@/features/integrations/constants'
import { useMemo, useRef, useState } from 'react'
import { Button } from '../../../../shared/components/ui/button'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { Alert, AlertDescription, AlertTitle } from '../../../../shared/components/ui/alert'
import Link from 'next/link'
import { z } from 'zod'
import { createIntegrationSchema } from '@/shared/schemas/integrations'
import { Integration } from '@/app/api/organizations/[org_id]/integrations/route'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../shared/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../../../../shared/components/ui/dropdown-menu'
import { Skeleton } from '../../../../shared/components/ui/skeleton'
import { useTranslation } from 'react-i18next'
import { GoogleSheetsList } from './google-sheets-list'

export const IntegrationList = ({ type }: { type: IntegrationType }) => {
  if (type === IntegrationType.GOOGLE_SHEETS) {
    return <GoogleSheetsList />
  }

  const { pagination, setPagination, sorting, filters, search, setSorting, setFilter, setSearch } =
    useFilters({
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
      sorting: [
        {
          id: 'created_at',
          desc: true,
        },
      ],
    })
  const { org_id }: { org_id: string } = useParams()
  const { data, isLoading } = useGetIntegrations(org_id, {
    pagination,
    search,
    sorting,
    filters: {
      type,
    },
  })
  const { mutate: bulkDelete, isPending: isDeleting } = useBulkDeleteIntegration(org_id)
  const onDeleteBulk = ({
    selectedRows,
    callback,
  }: {
    selectedRows: Record<string, boolean>
    callback?: () => void
  }) => {
    const selectedIds = Object.entries(selectedRows)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id)
    bulkDelete(selectedIds, {
      onSuccess: () => {
        callback?.()
      },
    })
  }
  const editIntegrationRef = useRef<DialogCustomRef>(null)
  const [selected, setSelected] = useState<Integration | undefined>(undefined)
  const { orgPlan } = useOrganizationStoreProvider()
  const canCreateIntegration = useMemo(() => {
    if (!orgPlan) return false
    return orgPlan.max_integrations_per_org > 0
  }, [orgPlan])
  const { mutate, isPending } = useCreateIntegration(org_id)
  const handleSubmit = (values: z.infer<typeof createIntegrationSchema>, close: () => void) => {
    mutate(values, {
      onSuccess: (data) => {
        close()
      },
    })
  }
  const { mutate: updateIntegration, isPending: isUpdating } = useUpdateIntegration(org_id)

  const [visible, setVisible] = useState<{ [key: string]: boolean }>({})

  const { t } = useTranslation('integration')

  return (
    <div className="space-y-6">
      <Alert size={'lg'} variant="info" className="bg-background">
        <AlertTitle>{t('integration_list.overview')}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="text-sm font-normal">{t(mappingIntegrationType[type].description)}</p>
          <p className="flex items-center gap-2 text-foreground [&_svg]:text-foreground! text-sm font-medium">
            <FileSpreadsheetIcon className="w-5! h-5!" /> {t('integration_list.documentation')}:{' '}
            <Link
              className="font-normal italic hover:underline"
              href={mappingIntegrationType[type].docs_url}
              target={mappingIntegrationType[type].docs_url === '#' ? '_self' : '_blank'}
            >
              {mappingIntegrationType[type].docs_url === '#'
                ? 'Coming soon'
                : mappingIntegrationType[type].docs_url}
            </Link>
          </p>
          <p className="flex items-center gap-2 text-foreground [&_svg]:text-foreground! text-sm font-medium">
            <GlobeIcon className="w-5! h-5!" /> Website:{' '}
            <Link
              className="font-normal italic hover:underline"
              href={mappingIntegrationType[type].website_url}
              target="_blank"
            >
              {mappingIntegrationType[type].website_url}
            </Link>
          </p>
        </AlertDescription>
      </Alert>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t('integration_list.configuration')}</h2>
        <CustomDialog
          title={t('common:buttons.create', { field: t('common:module.integration') })}
          noFooter
          size="sm"
          button={
            <Button
              disabled={!canCreateIntegration}
              variant={'default'}
              iconLeft={<PlusIcon className="w-6! h-6!" />}
              iconRight={
                !canCreateIntegration && <span className="text-secondary">(Plan limit)</span>
              }
            >
              {t('common:buttons.create', { field: t('common:module.integration') })}
            </Button>
          }
        >
          {({ close }) => (
            <IntegrationForm
              close={close}
              type={type}
              isPending={isPending}
              onSubmit={(values) => handleSubmit(values, close)}
            />
          )}
        </CustomDialog>
      </div>
      <CustomDialog
        title={t('common:buttons.edit', { field: t('common:module.integration') })}
        noFooter
        size="sm"
        noButton
        ref={editIntegrationRef}
      >
        {({ close }) => (
          <div className="flex flex-col gap-4 mt-4 justify-end">
            <IntegrationForm
              type={type}
              isPending={isUpdating}
              initialData={selected}
              close={close}
              onSubmit={(values) => {
                if (!selected) return
                updateIntegration(
                  { integration_id: selected.id, data: values },
                  {
                    onSuccess: () => {
                      close()
                    },
                  }
                )
              }}
            />
          </div>
        )}
      </CustomDialog>
      <div className="space-y-4">
        <h2 className="text-[15px] font-semibold">{t('integration_list.all_integrations')}</h2>
        {isLoading ? (
          <Skeleton className="w-full h-[400px]" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.data.map((integration) => {
              return (
                <Card key={integration.id}>
                  <CardHeader className="px-6 py-[16px]">
                    <CardTitle className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <KeyIcon className="w-[18px] h-[18px] text-neutral-900" />
                        <span className="text-foreground text-[15px] font-semibold">
                          {integration.name}
                        </span>
                      </div>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="p-1! w-[24px]! h-[24px]!"
                            // className="flex p-0 data-[state=open]:bg-muted text-guest-primary-default bg-neutral-400"
                          >
                            <MoreVerticalIcon className="w-[18px] h-[18px] text-neutral-900" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="">
                          <DropdownMenuItem
                            onSelect={(e) => {
                              editIntegrationRef.current?.open()
                              setSelected(integration)
                            }}
                            className="text-slate-500 font-medium"
                          >
                            {t('common:buttons.edit', { field: '' })}
                            <DropdownMenuShortcut>
                              {isUpdating ? (
                                <Loader2Icon className="h-4 w-4 animate-spin" />
                              ) : (
                                <PenLineIcon className="h-4 w-4" />
                              )}
                            </DropdownMenuShortcut>
                          </DropdownMenuItem>
                          <CustomDialog
                            size="xs"
                            title={t('common:buttons.delete', {
                              field: 'Integration',
                            })}
                            button={
                              <DropdownMenuItem
                                className="text-slate-500 font-medium"
                                onSelect={(e) => {
                                  e.preventDefault()
                                }}
                              >
                                {t('common:buttons.delete', { field: '' })}
                                <DropdownMenuShortcut>
                                  {isDeleting ? (
                                    <Loader2Icon className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2Icon className="h-4 w-4" />
                                  )}
                                </DropdownMenuShortcut>
                              </DropdownMenuItem>
                            }
                            children={({ close }) => (
                              <div>
                                <p className="text-sm font-normal text-slate-600">
                                  {t('common:messages.delete_dialog', {
                                    field: 'Integration',
                                  })}
                                </p>
                                <div className="mt-4 flex justify-end gap-6">
                                  <Button variant="secondary" size="lg" onClick={close}>
                                    {t('common:buttons.cancel')}
                                  </Button>
                                  <LoadingButton
                                    isLoading={isDeleting}
                                    size="lg"
                                    variant="destructive"
                                    onClick={() => {
                                      bulkDelete([integration.id], {
                                        onSuccess: () => {
                                          close()
                                        },
                                      })
                                    }}
                                  >
                                    <Trash2Icon className="h-4 w-4" />
                                    {t('common:buttons.delete', { field: '' })}
                                  </LoadingButton>
                                </div>
                              </div>
                            )}
                            noFooter
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardTitle>
                    <CardContent className="px-0 pb-0">
                      <div className="flex flex-col gap-[6px]">
                        <p className="text-xs font-semibold text-slate-400 italic">API key</p>
                        <div className="flex justify-between items-center gap-2">
                          {!visible?.[integration.id] ? (
                            <p className="text-sm font-normal text-slate-600">
                              **********************************
                            </p>
                          ) : (
                            <p className="text-sm font-normal text-slate-600">
                              {(integration.config as { api_key: string })?.api_key}
                            </p>
                          )}
                          <Button
                            variant="table"
                            size="icon"
                            className="p-1! w-[24px]! h-[24px]! rounded-[4px]"
                            type="button"
                            onClick={() =>
                              setVisible({
                                ...visible,
                                [integration.id]: !visible?.[integration.id],
                              })
                            }
                          >
                            {!visible?.[integration.id] ? <EyeIcon /> : <EyeOffIcon />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        )}
        {/* <TableActionProvider
          actions={[
            {
              name: "edit",
              label: "Edit",
              action: (row) => {
                editIntegrationRef.current?.open();
                setSelected(row);
              },
            },
            {
              name: "delete",
              label: "Delete",
              warnType: "dialog",
              warnTitle: "Delete Integration?",
              warnDesc:
                "Are you sure you want to delete this integration? This action cannot be undone and may affect connected services.",
              isLoading: isDeleting,
              action: (row, options) => {
                bulkDelete([row.id], {
                  onSuccess: () => {
                    options?.onSuccess?.();
                  },
                });
              },
            },
          ]}
        >
          <CustomTable
            className="bg-background rounded-2xl"
            extras={
              <div className="flex gap-4 items-end">
                <DataFilterItem
                  className="w-52 h-10 placeholder:text-slate-400 text-slate-400 border-dashed border-slate-400 min-h-auto placeholder:text-sm shadow-none placeholder:leading-[20px]"
                  variant="muted"
                  size="sm"
                  name="search"
                  placeholder="Search by name..."
                  type="search"
                  setSearch={setSearch}
                  search={search}
                />
                <DataFilterItem
                  name="created_at"
                  label="Created At"
                  placeholder="Created At"
                  className="px-4 py-[10px] rounded-[8px]"
                  type="date_range"
                  setFilter={setFilter}
                  filters={filters}
                  variant="muted"
                  size="sm"
                  Icon={CalendarFoldIcon}
                />
              </div>
            }
            pagination={pagination}
            setPagination={setPagination}
            setSorting={setSorting}
            sorting={sorting}
            columns={integrationColumns}
            data={data?.data || []}
            rowCount={data?.rowCount}
            enableRowSelection={true}
            onDeleteSelected={onDeleteBulk}
            isLoading={isLoading}
            isDeleting={isDeleting}
          />
        </TableActionProvider> */}
      </div>
      <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>
    </div>
  )
}
