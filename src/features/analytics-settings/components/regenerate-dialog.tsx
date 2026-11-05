'use client'

import { Button } from '@/shared/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import { useRegenerateKey } from '../hooks/mutations'

interface RegenerateDialogProps {
  org_id: string
}

export const RegenerateDialog = ({ org_id }: RegenerateDialogProps) => {
  const { t } = useTranslation('analytics_settings')
  const regenerateKeyMutation = useRegenerateKey(org_id)

  const handleRegenerate = async () => {
    try {
      await regenerateKeyMutation.mutateAsync()
      toast.success(t('publishable_key.regenerated'))
    } catch (error) {
      toast.error(t('common:messages.error.default'))
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('publishable_key.regenerate')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('publishable_key.regenerate_title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('publishable_key.regenerate_warning')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common:buttons.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleRegenerate} disabled={regenerateKeyMutation.isPending}>
            {regenerateKeyMutation.isPending
              ? t('common:buttons.loading')
              : t('publishable_key.regenerate')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
