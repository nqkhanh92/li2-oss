'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/shared/components/ui/button'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { useDeleteDashboard, useDuplicateDashboard } from '../hooks/mutations'

interface BulkActionBarProps {
  selectedIds: Set<string>
  orgId: string
  onClearAll: () => void
}

export function BulkActionBar({ selectedIds, orgId, onClearAll }: BulkActionBarProps) {
  const { t } = useTranslation('dashboards')
  const { confirm } = useConfirmDialog()
  const deleteDashboard = useDeleteDashboard(orgId)
  const duplicateDashboard = useDuplicateDashboard(orgId)
  const [isBusy, setIsBusy] = useState(false)

  const count = selectedIds.size

  const handleBulkDuplicate = async () => {
    const ids = Array.from(selectedIds)
    setIsBusy(true)
    try {
      await Promise.allSettled(ids.map((id) => duplicateDashboard.mutateAsync(id)))
    } finally {
      setIsBusy(false)
    }
    onClearAll()
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds) // snapshot BEFORE async confirm gap
    const ok = await confirm({
      title: t('bulk.deleteConfirm.title', { defaultValue: 'Delete {{count}} dashboards', count: ids.length }),
      description: t('bulk.deleteConfirm.description', {
        defaultValue: 'Are you sure you want to delete {{count}} dashboards? This action cannot be undone.',
        count: ids.length,
      }),
      confirmButtonText: t('bulk.delete', { defaultValue: 'Delete' }),
      cancelButtonText: t('common:actions.cancel', { defaultValue: 'Cancel' }),
    })
    setTimeout(() => document.body.style.removeProperty('pointer-events'), 0)
    if (ok) {
      setIsBusy(true)
      try {
        await Promise.allSettled(ids.map((id) => deleteDashboard.mutateAsync(id)))
      } finally {
        setIsBusy(false)
      }
      onClearAll()
    }
  }

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-white shadow-xl"
        >
          <span className="text-sm font-medium">
            {t('bulk.selected', { defaultValue: '{{count}} selected', count })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={handleBulkDuplicate}
            disabled={isBusy}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            {t('bulk.duplicate', { defaultValue: 'Duplicate' })}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isBusy}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {t('bulk.delete', { defaultValue: 'Delete' })}
          </Button>
          <Button variant="ghost" size="icon" className="text-white/70 hover:text-white h-7 w-7" onClick={onClearAll}>
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
