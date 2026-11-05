import React, { Dispatch, SetStateAction, useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import PremiumBadge from '../PremiumBadge'
import { defineStepper } from '@/shared/components/ui/stepper'
import { cn } from '@/shared/lib/utils'
import { Separator } from '@/shared/components/ui/separator'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { useGetIntegrationDropdowns } from '@/features/integrations/hooks/queries'
import {
  useGetSheetHeaders,
  useGetSheetValues,
  useGetSpreadsheets,
} from '@/features/integrations/hooks/queries/google-sheets'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { Label } from '@/shared/components/ui/label'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import { getColumns } from '../../constants/import'
import { MoveRight } from 'lucide-react'
import { useTouchPointColumnMapping } from '../../hooks/use-touchpoint-column-mapping'
import { IntegrationType } from '@/features/integrations/constants'
import { toast } from 'sonner'
import { useTouchPointImportSubmit } from '../../hooks/use-touchpoint-import-submit'
import { useCustomDialog } from '@/shared/providers/custom-dialog-provider'
import { LoadingButton } from '@/shared/components/customize/loading-button'

export const {
  StepperProvider: ImportStepperProvider,
  StepperTitle: ImportStepperTitle,
  StepperDescription: ImportStepperDescription,
  useStepper: useImportStepper,
} = defineStepper(
  {
    id: 'select-sheets-step',
    title: 'import.from_sheets_steps.select_sheets.title',
    description: 'import.from_sheets_steps.select_sheets.description',
  },
  {
    id: 'mapping-step',
    title: 'import.from_sheets_steps.mapping.title',
    description: 'import.from_sheets_steps.mapping.description',
  }
)

export const ImportFromSheetsStepper = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('touchpoint')
  const { all, current, switch: switchStep } = useImportStepper()

  const [selectedIntegration, setSelectedIntegration] = useState<string | undefined>(undefined)
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<string | undefined>(undefined)
  const [selectedSheet, setSelectedSheet] = useState<string | undefined>(undefined)

  const {
    data: headers,
    isLoading: headersLoading,
    error: headersError,
  } = useGetSheetHeaders(org_id, selectedIntegration, selectedSpreadsheet, selectedSheet)
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
                {t(step.title)}
              </span>
            </div>

            {all.indexOf(step) < all.length - 1 && (
              <Separator className="ml-6 md:w-32 w-16 h-px bg-gray-200" />
            )}
          </div>
        ))}
      </div>

      {switchStep({
        'select-sheets-step': () => (
          <SelectSheetsImportStep
            selectedIntegration={selectedIntegration}
            selectedSpreadsheet={selectedSpreadsheet}
            selectedSheet={selectedSheet}
            setSelectedIntegration={setSelectedIntegration}
            setSelectedSpreadsheet={setSelectedSpreadsheet}
            setSelectedSheet={setSelectedSheet}
          />
        ),
        'mapping-step': () => (
          <LoadingMask className="w-full" loading={headersLoading}>
            <MapColumnsFromSheetStep
              headers={headers || []}
              selectedIntegration={selectedIntegration!}
              selectedSpreadsheet={selectedSpreadsheet!}
              selectedSheet={selectedSheet!}
            />
          </LoadingMask>
        ),
      })}
    </React.Fragment>
  )
}
type SelectSheetsImportStepProps = {
  selectedIntegration: string | undefined
  selectedSpreadsheet: string | undefined
  selectedSheet: string | undefined
  setSelectedIntegration: Dispatch<SetStateAction<string | undefined>>
  setSelectedSpreadsheet: Dispatch<SetStateAction<string | undefined>>
  setSelectedSheet: Dispatch<SetStateAction<string | undefined>>
}
export const SelectSheetsImportStep = ({
  selectedIntegration,
  selectedSpreadsheet,
  selectedSheet,
  setSelectedIntegration,
  setSelectedSpreadsheet,
  setSelectedSheet,
}: SelectSheetsImportStepProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('touchpoint')
  const { next } = useImportStepper()

  const { data: integrations, isLoading: integrationsLoading } = useGetIntegrationDropdowns(
    org_id,
    IntegrationType.GOOGLE_SHEETS
  )
  const { data: spreadsheets, isLoading: spreadsheetsLoading } = useGetSpreadsheets(
    org_id,
    selectedIntegration
  )
  const { data: sheets, isLoading: sheetsLoading } = useGetSheetValues(
    org_id,
    selectedIntegration,
    selectedSpreadsheet
  )

  const handleIntegrationChange = (integrationId: string) => {
    setSelectedIntegration(integrationId)
    setSelectedSpreadsheet(undefined)
    setSelectedSheet(undefined)
  }

  const handleSpreadsheetChange = (spreadsheetId: string) => {
    setSelectedSpreadsheet(spreadsheetId)
    setSelectedSheet(undefined)
  }

  const canContinue = !!selectedIntegration && !!selectedSpreadsheet && selectedSheet !== undefined

  const handleNext = () => {
    if (!canContinue) return
    next()
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-4">
        <LoadingMask className="w-full" loading={integrationsLoading}>
          <Label>{t('common:form.fields.integration')}</Label>
          <SingleCommandSelect
            placeholder={t('common:form.label.integration')}
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

        <LoadingMask className="w-full" loading={spreadsheetsLoading}>
          <Label>{t('common:form.fields.spreadsheet')}</Label>
          <SingleCommandSelect
            placeholder={t('common:form.label.spreadsheet')}
            options={
              spreadsheets?.map((spreadsheet) => ({
                value: spreadsheet.id,
                label: spreadsheet.name,
              })) || []
            }
            disabled={!selectedIntegration}
            value={selectedSpreadsheet}
            onChange={handleSpreadsheetChange}
          />
        </LoadingMask>

        <LoadingMask className="w-full" loading={sheetsLoading}>
          <Label>{t('common:form.fields.sheet')}</Label>
          <SingleCommandSelect
            placeholder={t('common:form.label.sheet')}
            options={
              sheets?.map((sheet) => ({
                value: sheet.id,
                label: sheet.name,
              })) || []
            }
            disabled={!selectedSpreadsheet}
            value={selectedSheet}
            onChange={setSelectedSheet}
          />
        </LoadingMask>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={handleNext} disabled={!canContinue} title={t('common:buttons.next')}>
          {t('common:buttons.next')}
        </Button>
      </div>
    </div>
  )
}

type MapColumnsFromSheetStepProps = {
  headers: string[]
  selectedIntegration: string
  selectedSpreadsheet: string
  selectedSheet: string
}
export const MapColumnsFromSheetStep = ({
  headers,
  selectedIntegration,
  selectedSpreadsheet,
  selectedSheet,
}: MapColumnsFromSheetStepProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('touchpoint')
  const columns = useMemo(() => getColumns(t), [t])

  const { prev } = useImportStepper()
  const {
    mapping,
    autoMappingColumns,
    handleMappingChange,
    validateMapping,
    reset: resetMapping,
  } = useTouchPointColumnMapping({
    csvHeaders: headers,
    columns,
    orgId: org_id,
    t,
  })

  const handleBack = () => {
    prev()
  }

  const { closeDialog } = useCustomDialog()

  const { handleSubmit, isPending } = useTouchPointImportSubmit({
    orgId: org_id,
    onSuccess: () => {
      resetMapping()
      closeDialog()
    },
    type: 'sheets',
  })

  const handleConfirm = async () => {
    const validateResult = validateMapping()
    if (validateResult.error) {
      toast.error(validateResult.error)
      return
    }
    handleSubmit({
      orgId: org_id,
      integrationId: selectedIntegration,
      spreadsheetId: selectedSpreadsheet,
      sheetId: selectedSheet,
      mapping,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border border-slate-300 rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex gap-6 items-center border-b border-slate-300 py-2">
            <div className="w-[47%] overflow-hidden">
              <div className="px-4">
                <p className="text-base text-foreground leading-6">
                  {t('touchpoint:import.sheets_data')}
                </p>
              </div>
            </div>
            <div className="w-[6%]">
              <MoveRight className="w-6 h-6 text-slate-500 shrink-0" />
            </div>
            <div className="w-[47%] overflow-hidden">
              <div className="px-4">
                <p className="text-base text-foreground leading-6">
                  {t('touchpoint:import.li2_data')}
                </p>
              </div>
            </div>
          </div>

          {/* Mapping Rows */}
          <div className="flex flex-col gap-2 w-full">
            {columns
              .filter((c) => !c.importDisabled)
              .map((col, index: number) => {
                const isMapped = mapping.has(col.id)
                return (
                  <div key={`row-${index}`} className="flex gap-6 items-center">
                    <div className="w-[47%] overflow-hidden">
                      <LoadingMask
                        className="w-full"
                        loading={autoMappingColumns.includes(col.id) && !isMapped}
                      >
                        <SingleCommandSelect
                          modal
                          key={`csv-column-${index}`}
                          size="sm"
                          placeholder={t('common:text.select_or_leave_empty')}
                          value={mapping.get(col.id) || undefined}
                          onChange={(value) => handleMappingChange(col.id, value)}
                          options={headers.map((e: string) => {
                            return {
                              value: e,
                              label: e,
                            }
                          })}
                        />
                      </LoadingMask>
                    </div>
                    <div className="w-[6%]">
                      <MoveRight className="w-6 h-6 text-slate-500 shrink-0" />
                    </div>
                    <div className="w-[47%] overflow-hidden">
                      <span>
                        {col.label} {col.importRequired && <span className="text-red-500">*</span>}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button onClick={handleBack} title={t('common:buttons.back')}>
          {t('common:buttons.back')}
        </Button>
        <LoadingButton
          type="button"
          variant="default"
          onClick={handleConfirm}
          isLoading={isPending}
        >
          {t('common:buttons.confirm', { defaultValue: 'Confirm import' })}
        </LoadingButton>
      </div>
    </div>
  )
}

type ImportFromSheetsButtonProps = {
  button?: React.ReactNode
}

export const ImportFromSheetsButton = ({ button }: ImportFromSheetsButtonProps) => {
  const { t } = useTranslation(['touchpoint', 'common'])

  return (
    <CustomDialogV2
      size={'md'}
      button={
        button ?? (
          <Button
            title={t('common:buttons.import_field', {
              field: t('touchpoint:import.sheets_label'),
            })}
            onClick={() => {}}
          >
            {t('common:buttons.import_field', {
              field: t('touchpoint:import.sheets_label'),
            })}
          </Button>
        )
      }
      description={t('touchpoint:import.description')}
      title={
        <div className="flex gap-1 items-center">
          {t('common:buttons.import_field', { field: t('touchpoint:import.sheets_label') })}
          <PremiumBadge btnText="" />
        </div>
      }
      noSeparator
    >
      <ImportStepperProvider className="space-y-4" variant="horizontal">
        <ImportFromSheetsStepper />
      </ImportStepperProvider>
    </CustomDialogV2>
  )
}
