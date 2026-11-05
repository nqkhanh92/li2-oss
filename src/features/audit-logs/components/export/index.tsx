'use client'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { ExportForm } from './export-form'
import { ExportAuditLogsParams } from '../../types'
import { Suspense } from 'react'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'

interface ExportAuditLogsProps {
  filters?: Partial<ExportAuditLogsParams>
}

export const ExportAuditLogs = ({ filters }: ExportAuditLogsProps) => {
  const { t } = useTranslation(['common', 'audit'])

  return (
    <CustomDialogV2
      size="xs"
      button={
        <Button
          className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-md flex items-center gap-1 h-10"
          size="sm"
        >
          <Download className="w-5 h-5" />
          <span className="text-base font-medium">
            {t('common:buttons.export_field', { field: 'logs' })}
          </span>
        </Button>
      }
      title={t('audit:export.title')}
      description={t('audit:export.description')}
    >
      {({ setOpen }) => (
        <Suspense fallback={<SkeletonCard bodyParts={5} />}>
          <ExportForm close={() => setOpen(false)} filters={filters} />
        </Suspense>
      )}
    </CustomDialogV2>
  )
}
