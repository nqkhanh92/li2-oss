import { Button } from '@/shared/components/ui/button'
import { Trans, useTranslation } from 'react-i18next'
import React, { useState, useMemo, useEffect, Dispatch, SetStateAction, useRef } from 'react'
import { DateRange } from 'react-day-picker'
import { DateRangeFilter } from './date-range-filter'
import { ColumnSelector } from './column-selector'
import { getColumns } from '../../constants/import'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import PremiumBadge from '../PremiumBadge'
import { defineStepper } from '@/shared/components/ui/stepper'
import { cn } from '@/shared/lib/utils'
import { Separator } from '@/shared/components/ui/separator'
import { useGetIntegrationDropdowns } from '@/features/integrations/hooks/queries'
import { useParams, useRouter } from 'next/navigation'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import {
  useGetSheetValues,
  useGetSpreadsheets,
} from '@/features/integrations/hooks/queries/google-sheets'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { CustomSwitch } from '@/shared/components/customize/custom-switch'
import { Label } from '@/shared/components/ui/label'
import { FormDescription } from '@/shared/components/ui/form'
import { Typography } from '@/shared/components/ui/typography'
import { IntegrationType } from '@/features/integrations/constants'
import { createExportStrategy } from '../../utils/export-strategies'
import { useExportTouchPointsData } from '../../hooks/use-export-touch-points-data'
import { toast } from 'sonner'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useCustomDialog } from '@/shared/providers/custom-dialog-provider'

export const {
  StepperProvider,
  StepperControls,
  StepperNavigation,
  StepperPanel,
  StepperStep,
  StepperTitle,
  useStepper,
  StepperDescription,
} = defineStepper(
  {
    id: 'select-fields-step',
    title: 'touchpoint:export.to_sheets_steps.select_fields.title',
    description: 'touchpoint:export.to_sheets_steps.select_fields.description',
  },
  {
    id: 'select-sheets-step',
    title: 'touchpoint:export.to_sheets_steps.select_sheets.title',
    description: 'touchpoint:export.to_sheets_steps.select_sheets.description',
  }
)

export const ExportToSheetsStepper = ({
  qrOnly,
  nfcOnly,
}: {
  qrOnly?: boolean
  nfcOnly?: boolean
}) => {
  const { t } = useTranslation('touchpoint')
  const { all, current, switch: switchStep } = useStepper()
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])

  return (
    <React.Fragment>
      <div className="flex items-center space-x-8 w-full">
        {all.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center space-x-3">
              <div
                className={cn(
                  'w-5 h-5 rounded-full min-w-5 min-h-5 flex items-center justify-center text-sm font-medium',
                  all.indexOf(current) >= index
                    ? 'bg-primary'
                    : 'bg-background border border-gray-200'
                )}
              >
                <div
                  className={cn(
                    'bg-background w-2 h-2 rounded-full',
                    all.indexOf(current) >= index ? 'bg-background' : 'bg-gray-200'
                  )}
                ></div>
              </div>

              <span
                className={cn(
                  'text-sm',
                  all.indexOf(current) >= index ? 'text-gray-900' : 'text-gray-400'
                )}
              >
                <Trans i18nKey={step.title} components={{ br: <br /> }} />
              </span>
            </div>

            {/* Connector Line (don't show after last step) */}
            {all.indexOf(step) < all.length - 1 && (
              <Separator className="ml-6 md:w-32 w-16 h-px bg-gray-200" />
            )}
          </div>
        ))}
      </div>
      {switchStep({
        'select-fields-step': () => {
          return (
            <SelectFieldsStep
              qrOnly={qrOnly}
              nfcOnly={nfcOnly}
              selectedColumns={selectedColumns}
              setSelectedColumns={setSelectedColumns}
            />
          )
        },
        'select-sheets-step': () => {
          return (
            <SelectSheetsStep selectedColumns={selectedColumns} qrOnly={qrOnly} nfcOnly={nfcOnly} />
          )
        },
      })}
    </React.Fragment>
  )
}

type SelectFieldsStepProps = {
  close?: () => void
  qrOnly?: boolean
  nfcOnly?: boolean
  selectedColumns: string[]
  setSelectedColumns: Dispatch<SetStateAction<string[]>>
}

export const SelectFieldsStep = ({
  close,
  qrOnly,
  nfcOnly,
  selectedColumns,
  setSelectedColumns,
}: SelectFieldsStepProps) => {
  const { t } = useTranslation('touchpoint')
  const { next } = useStepper()

  const columns = useMemo(() => getColumns(t), [])

  const initRef = useRef(false)
  useEffect(() => {
    if (!initRef.current && columns) {
      setSelectedColumns(columns.filter((col) => col.checked).map((col) => col.id))
      initRef.current = true
    }
  }, [columns])

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const handleToggleColumn = (id: string) => {
    setSelectedColumns((prev) =>
      prev.includes(id) ? prev.filter((colId) => colId !== id) : [...prev, id]
    )
  }

  const handleExport = async () => {
    next()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 px-6 py-3 border-slate-300 border rounded-[16px]">
        <DateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          label={t('common:filter.by_created_at')}
          placeholder={t('common:form.placeholder.all_time')}
        />
        <ColumnSelector
          columns={columns}
          selectedColumns={selectedColumns}
          onToggle={handleToggleColumn}
          label={t('touchpoint:export.columns_label')}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={handleExport} title={t('common:buttons.next')}>
          {t('common:buttons.next')}
        </Button>
      </div>
    </div>
  )
}

type SelectSheetsStepProps = {
  close?: () => void
  qrOnly?: boolean
  nfcOnly?: boolean
  selectedColumns?: string[]
  dateRange?: DateRange
}

export const SelectSheetsStep = ({
  close,
  qrOnly,
  nfcOnly,
  selectedColumns,
  dateRange,
}: SelectSheetsStepProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('touchpoint')
  const router = useRouter()
  const { closeDialog } = useCustomDialog()

  const [selectedIntegration, setSelectedIntegration] = useState<string | undefined>(undefined)

  const { data: integrations, isLoading: integrationsLoading } = useGetIntegrationDropdowns(org_id)
  const handleIntegrationChange = (integrationId: string) => {
    setSelectedIntegration(integrationId)
  }
  const exportStrategy = useMemo(() => createExportStrategy('sheets'), [])
  const columns = useMemo(() => getColumns(t), [t])

  const { exportData, isExporting } = useExportTouchPointsData({
    orgId: org_id,
    qrOnly,
    nfcOnly,
    columns,
    exportStrategy,
    dateRange,
  })

  const handleExport = async () => {
    if (!selectedColumns || selectedColumns.length === 0) {
      toast.error(t('touchpoint:export.no_columns_selected'))
      return
    }
    exportData(selectedColumns, {
      extra: {
        integration_id: selectedIntegration,
      },
      onSuccess: () => {
        closeDialog()
      },
    })
  }

  return (
    <div className="w-full space-y-4">
      <LoadingMask className="w-full" loading={integrationsLoading}>
        <Label>{t('touchpoint:export.select_sheets_integration')}</Label>
        <SingleCommandSelect
          placeholder={t('touchpoint:export.select_sheets_integration')}
          options={
            integrations?.map((integration) => ({
              value: integration.id,
              label: integration.name,
            })) || []
          }
          value={selectedIntegration}
          onChange={handleIntegrationChange}
        />
      </LoadingMask>
      {integrations && integrations.length === 0 && (
        <Typography size="xs">
          {t('touchpoint:export.to_sheets_steps.missing_integration.description')}
          <Typography
            className="italic"
            variant={'link'}
            size="xs"
            onClick={() => {
              router.push(
                `/org/${org_id}/integrations/${IntegrationType.GOOGLE_SHEETS.toLowerCase()}`
              )
            }}
          >
            {t('touchpoint:export.to_sheets_steps.missing_integration.link_label')}
          </Typography>
        </Typography>
      )}
      <div className="flex justify-end gap-2">
        <LoadingButton isLoading={isExporting} onClick={handleExport}>
          {t('touchpoint:export.export_button')}
        </LoadingButton>
      </div>
    </div>
  )
}

type ExportToSheetsButtonProps = {
  qrOnly?: boolean
  nfcOnly?: boolean
  button?: React.ReactNode
}
export const ExportToSheetsButton = ({ qrOnly, nfcOnly, button }: ExportToSheetsButtonProps) => {
  const { t } = useTranslation(['touchpoint', 'common'])

  return (
    <CustomDialogV2
      size={'md'}
      button={
        button ?? (
          <Button title={t('touchpoint:export.to_sheets')} onClick={() => {}}>
            {t('touchpoint:export.to_sheets')}
          </Button>
        )
      }
      description={t('touchpoint:export.description')}
      title={
        <div className="flex gap-1 items-center">
          {t('touchpoint:export.to_sheets')}
          <PremiumBadge btnText="" />
        </div>
      }
      noSeparator
    >
      <StepperProvider className="space-y-4" variant="horizontal">
        <ExportToSheetsStepper qrOnly={qrOnly} nfcOnly={nfcOnly} />
      </StepperProvider>
    </CustomDialogV2>
  )
}
