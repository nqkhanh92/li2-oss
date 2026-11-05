'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ApiKeyWithSecret } from '@/shared/types/api-key'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { useTranslation } from 'react-i18next'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'

interface ApiKeyCreatedDialogProps {
  apiKey: ApiKeyWithSecret
  onClose: () => void
}

export function ApiKeyCreatedDialog({ apiKey, onClose }: ApiKeyCreatedDialogProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.secret_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <CustomDialogV2
      open={true}
      onOpenChange={(_open) => {
        if (!_open) onClose()
      }}
      size="md"
      title={t('api_keys:created_dialog.title')}
      description={t('api_keys:created_dialog.description')}
    >
      <div className="space-y-4 pt-4">
        <Alert variant="warning">
          <AlertTitle>{t('common:important')}</AlertTitle>
          <AlertDescription>{t('api_keys:created_dialog.description')}</AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('api_keys:created_dialog.key_label')}</label>
          <div className="flex items-center gap-2 h-9 overflow-hidden">
            <code className="flex-1 bg-slate-100 px-4 h-9 items-center rounded text-sm font-mono break-all flex">
              {apiKey.secret_key}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  {t('api_keys:created_dialog.copied')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('api_keys:created_dialog.copy_button')}
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={onClose}>{t('api_keys:created_dialog.close_button')}</Button>
        </div>
      </div>
    </CustomDialogV2>
  )
}
