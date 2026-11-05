'use client'

import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useExportCustomers } from '../hooks/queries'
import { toast } from '@/shared/hooks/use-toast'

export function CustomerExportButton() {
  const { t } = useTranslation('customers')
  const { org_id } = useParams<{ org_id: string }>()

  const { mutate: exportCustomers, isPending } = useExportCustomers(org_id)

  const handleExport = () => {
    exportCustomers(undefined, {
      onSuccess: () => {
        toast({ title: t('export.export_success', 'Export completed'), variant: 'success' })
      },
      onError: () => {
        toast({ title: 'Export failed', variant: 'destructive' })
      },
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isPending}
      className="h-10 bg-white border-slate-200 hover:bg-white text-slate-700"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {t('export.exporting', 'Exporting...')}
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          {t('export.export_csv', 'Export CSV')}
        </>
      )}
    </Button>
  )
}
