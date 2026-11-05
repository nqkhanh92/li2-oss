import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { useMemo, useRef, useState, useCallback } from 'react'
import { Button } from '@/shared/components/ui/button'
import FileUploader from '@/shared/components/ui/file-uploader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { ArrowRight, Download, MoveRight, Plus, UploadIcon, X } from 'lucide-react'
import Papa from 'papaparse'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/components/ui/input'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useParams } from 'next/navigation'
import { getColumns } from '../../constants/import'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { useCsvParser } from '../../hooks/use-csv-parser'
import { useTouchPointColumnMapping } from '../../hooks/use-touchpoint-column-mapping'
import { useTouchPointImportSubmit } from '../../hooks/use-touchpoint-import-submit'
import { toast } from 'sonner'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Badge } from '@/shared/components/ui/badge'
import PremiumBadge from '../PremiumBadge'
import { usePlanFeatures } from '../../hooks'

type Props = {
  button?: React.ReactNode
}
export const ImportTouchPoints = ({ button }: Props) => {
  const ref = useRef<DialogCustomRef>(null)
  const [file, setFile] = useState<File | null>(null)
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation('touchpoint')

  // Custom hooks for separation of concerns
  const { csvData, csvHeaders, isParsing } = useCsvParser(file)

  const columns = useMemo(() => getColumns(t), [t])

  const {
    mapping,
    autoMappingColumns,
    handleMappingChange,
    validateMapping,
    reset: resetMapping,
  } = useTouchPointColumnMapping({
    csvHeaders,
    columns,
    orgId: org_id,
    t,
  })

  const { handleSubmit, isPending } = useTouchPointImportSubmit({
    orgId: org_id,
    onSuccess: () => {
      handleReset()
      ref.current?.close()
    },
    type: 'csv',
  })
  const handleImport = () => {
    const validateResult = validateMapping()
    if (validateResult.error) {
      toast.error(validateResult.error)
      return
    }
    handleSubmit({
      orgId: org_id,
      file: file!,
      mapping,
    })
  }

  const handleReset = () => {
    setFile(null)
    resetMapping()
  }
  const { enableImport } = usePlanFeatures()

  const handleDownloadTemplate = useCallback(() => {
    const importableColumns = columns.filter((col) => !col.importDisabled)
    const sampleValues: Record<string, string> = {
      content_value: 'https://example.com',
      name: 'My Link Name',
      slug: 'my-custom-slug',
      short_url: '',
      tags: 'tag1, tag2',
      created_at: '',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'campaign_name',
      utm_term: 'keyword',
      utm_content: 'ad_content',
    }
    const sampleRow = importableColumns.reduce<Record<string, string>>((acc, col) => {
      acc[col.label] = sampleValues[col.id] ?? ''
      return acc
    }, {})
    const csv = Papa.unparse([sampleRow], { header: true })
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'touchpoints_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [columns])

  return (
    <CustomDialogV2
      title={
        <div className="flex gap-2 items-center">
          <span>{t('common:buttons.import_field', { field: 'CSV' })}</span>
          <PremiumBadge btnText="" />
        </div>
      }
      description={t('touchpoint:import.description')}
      button={
        button ?? (
          <Button
            title={t('common:buttons.import_field', { field: 'CSV' })}
            onClick={ref.current?.open}
          >
            {t('common:buttons.import_field', { field: 'CSV' })}
          </Button>
        )
      }
      size="sm"
      noSeparator
      ref={ref}
    >
      {({ setOpen }) => (
        <div className="flex flex-col gap-6">
          {!file && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="w-4 h-4" />
                  {t('touchpoint:import.download_template')}
                </Button>
              </div>
              <FileUploader noPreview onFileChange={setFile} accept="text/csv" />
            </div>
          )}
          {file && !isParsing && !csvData && (
            <div>{t('common:messages.error.field_invalid', { field: '$t(label.file)' })}</div>
          )}
          {csvData && (
            <>
              {/* Column Mapping Section */}
              <div className="border border-slate-300 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col gap-0.5">
                    {file && (
                      <Badge
                        size={'xs'}
                        className="ml-2 bg-blue-100 text-blue-500 hover:bg-blue-200"
                      >
                        <span className="line-clamp-1">{file?.name}</span>
                        <X className="ml-2 h-4 w-4 cursor-pointer" onClick={handleReset} />
                      </Badge>
                    )}
                  </div>
                  <Button type="button" variant="tertiary" onClick={handleReset}>
                    <UploadIcon className="w-[18px] h-[18px] text-slate-500" />
                    {t('common:form.choose_another_file')}
                  </Button>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Header Row */}
                  <div className="flex gap-6 items-center border-b border-slate-300 py-2">
                    <div className="w-[47%] overflow-hidden">
                      <div className="px-4">
                        <p className="text-base text-foreground leading-6">
                          {t('touchpoint:import.csv_data')}
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
                  <div className="flex flex-col gap-2">
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
                                  options={csvHeaders.map((e: string) => {
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
                                {col.label}{' '}
                                {col.importRequired && <span className="text-red-500">*</span>}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <LoadingButton
                  type="button"
                  isLoading={isPending}
                  variant="default"
                  disabled={!file || !enableImport}
                  onClick={handleImport}
                >
                  {t('common:buttons.confirm', { defaultValue: 'Confirm import' })}
                </LoadingButton>
              </div>
            </>
          )}
        </div>
      )}
    </CustomDialogV2>
  )
}
