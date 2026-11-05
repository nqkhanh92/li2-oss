'use client'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SquareCheck } from 'lucide-react'
import { getModuleLabel, getActionLabel } from '../../constants'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useExportAuditLogs } from '../../hooks/use-export-audit-logs'
import { ExportAuditLogsParams } from '../../types'

const exportFormSchema = z.object({
  format: z.enum(['csv', 'json']),
})

type ExportFormValues = z.infer<typeof exportFormSchema>

interface ExportFormProps {
  close: () => void
  filters?: Partial<ExportAuditLogsParams>
}

export const ExportForm = ({ close, filters }: ExportFormProps) => {
  const { t } = useTranslation(['common', 'audit'])
  const { org_id }: { org_id: string } = useParams()

  const { exportData, isExporting } = useExportAuditLogs({ orgId: org_id })

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    defaultValues: {
      format: 'csv',
    },
  })

  const onSubmit = async (values: ExportFormValues) => {
    try {
      await exportData({
        ...values,
        ...filters,
      })
      close()
    } catch (error) {
      // Error is handled in the hook
      console.error('Export error:', error)
    }
  }

  const getModuleValue = () => {
    if (!filters?.module) return t('audit:export.all')
    if (Array.isArray(filters.module)) {
      return filters.module.map((m) => getModuleLabel(t, m)).join(', ')
    }
    return getModuleLabel(t, filters.module)
  }

  const getActionValue = () => {
    if (!filters?.action) return t('audit:export.all')
    if (Array.isArray(filters.action)) {
      return filters.action.map((a) => getActionLabel(t, a)).join(', ')
    }
    return getActionLabel(t, filters.action)
  }

  const getDateRangeValue = () => {
    if (!filters?.start_date && !filters?.end_date) return t('audit:export.all')
    if (filters.start_date && filters.end_date) {
      return `${new Date(filters.start_date).toLocaleDateString()} - ${new Date(
        filters.end_date
      ).toLocaleDateString()}`
    }
    if (filters.start_date) {
      return `${t('audit:export.from')} ${new Date(filters.start_date).toLocaleDateString()}`
    }
    if (filters.end_date) {
      return `${t('audit:export.until')} ${new Date(filters.end_date).toLocaleDateString()}`
    }
    return t('audit:export.all')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="format"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-sm text-foreground leading-5">
                  {t('audit:export.format')}
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-slate-100 h-10 px-4 py-2 rounded-md border-0">
                      <SelectValue placeholder={t('audit:export.select_format')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground leading-5">
              {t('audit:export.current_filters_applied')}
            </p>
            <div className="flex flex-col">
              <div className="flex gap-2 items-center px-4 py-1.5 rounded">
                <SquareCheck className="w-[18px] h-[18px] text-foreground opacity-50 shrink-0" />
                <div className="flex gap-0.5 items-center">
                  <p className="text-sm text-foreground leading-5">
                    {t('audit:export.filter_labels.module')}
                  </p>
                  <p className="text-sm text-slate-600 leading-5">{getModuleValue()}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center px-4 py-1.5 rounded">
                <SquareCheck className="w-[18px] h-[18px] text-foreground opacity-50 shrink-0" />
                <div className="flex gap-0.5 items-center">
                  <p className="text-sm text-foreground leading-5">
                    {t('audit:export.filter_labels.action')}
                  </p>
                  <p className="text-sm text-slate-600 leading-5">{getActionValue()}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center px-4 py-1.5 rounded">
                <SquareCheck className="w-[18px] h-[18px] text-foreground opacity-50 shrink-0" />
                <div className="flex gap-0.5 items-center">
                  <p className="text-sm text-foreground leading-5">
                    {t('audit:export.filter_labels.date_range')}
                  </p>
                  <p className="text-sm text-slate-600 leading-5">{getDateRangeValue()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            {t('common:buttons.cancel')}
          </Button>
          <LoadingButton type="submit" isLoading={isExporting}>
            {t('common:buttons.export_field')}
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
