'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { ApiKey, ApiKeyWithSecret } from '@/shared/types/api-key'
import { useTranslation } from 'react-i18next'
import { Loader, RefreshCw } from 'lucide-react'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'

interface ApiKeyDetailDialogProps {
  apiKey: ApiKey | null
  open: boolean
  onClose: () => void
  onUpdateStatus: (id: string, isActive: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRegenerate: (id: string) => Promise<ApiKeyWithSecret>
}

export function ApiKeyDetailDialog({
  apiKey,
  open,
  onClose,
  onUpdateStatus,
  onDelete,
  onRegenerate,
}: ApiKeyDetailDialogProps) {
  const { t } = useTranslation(['api_keys'])
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const { confirm } = useConfirmDialog()

  if (!apiKey) return null

  const handleStatusToggle = async () => {
    setIsUpdating(true)
    try {
      await onUpdateStatus(apiKey.id, !apiKey.is_active)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRegenerate = async () => {
    const result = await confirm({
      title: t('common:text.warning'),
      description: t(
        'api_keys:actions.confirm_regenerate',
        'The old API key will be invalidated and no longer work. This action cannot be undone.'
      ),
    })

    if (!result) return

    setIsRegenerating(true)
    try {
      await onRegenerate(apiKey.id)
      onClose()
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleDelete = async () => {
    const result = await confirm({
      title: t('common:text.warning'),
      description: t('api_keys:actions.confirm_delete'),
    })

    if (!result) return

    setIsDeleting(true)
    try {
      await onDelete(apiKey.id)
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  const displayKey =
    apiKey.key_prefix && apiKey.key_suffix
      ? `${apiKey.key_prefix}...${apiKey.key_suffix}`
      : apiKey.key_prefix

  return (
    <CustomDialogV2
      open={open}
      setOpen={onClose}
      onOpenChange={(_open) => {
        if (!_open) {
          onClose()
        }
      }}
      size="sm"
      title={t('api_keys:detail_dialog.title')}
    >
      <div className="space-y-6 pt-4">
        {/* API Key Display */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">API Key</Label>
          <div className="font-mono text-sm bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
            {displayKey}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">{t('api_keys:detail_dialog.name_label')}</Label>
          <div className="text-sm font-medium">{apiKey.name}</div>
        </div>

        {/* Type */}
        <div className="space-y-2 flex flex-col">
          <Label className="text-xs text-slate-500">{t('api_keys:detail_dialog.type_label')}</Label>
          <Badge variant="outline" className="text-xs w-fit">
            {t(`api_keys:types.${apiKey.key_type}`)}
          </Badge>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center justify-between py-3 border-y border-slate-200">
          <div className="space-y-0.5">
            <Label htmlFor="status-toggle">{t('api_keys:detail_dialog.status_label')}</Label>
            <div className="text-xs text-slate-500">
              {apiKey.is_active
                ? t('api_keys:detail_dialog.status_active')
                : t('api_keys:detail_dialog.status_inactive')}
            </div>
          </div>
          <Switch
            id="status-toggle"
            checked={apiKey.is_active ?? false}
            onCheckedChange={handleStatusToggle}
            disabled={isUpdating}
          />
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">
              {t('api_keys:detail_dialog.created_label')}
            </Label>
            <div className="text-sm">{format(new Date(apiKey.created_at), 'MMM d, yyyy')}</div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">
              {t('api_keys:detail_dialog.last_used_label')}
            </Label>
            <div className="text-sm">
              {apiKey.last_used_at
                ? format(new Date(apiKey.last_used_at), 'MMM d, yyyy')
                : t('api_keys:detail_dialog.never_used')}
            </div>
          </div>
        </div>

        {/* Expires */}
        {apiKey.expires_at && (
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">
              {t('api_keys:detail_dialog.expires_label')}
            </Label>
            <div className="text-sm">{format(new Date(apiKey.expires_at), 'MMM d, yyyy')}</div>
          </div>
        )}

        {/* Permissions */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">
            {t('api_keys:detail_dialog.permissions_label')}
          </Label>
          <div className="text-sm font-medium mb-2">
            {t('api_keys:detail_dialog.permissions_count', {
              count: Array.isArray(apiKey.permissions) ? apiKey.permissions.length : 0,
            })}
          </div>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
            <div className="space-y-1.5">
              {Array.isArray(apiKey.permissions) &&
                apiKey.permissions.map((permission) => {
                  const permStr = typeof permission === 'string' ? permission : String(permission)
                  return (
                    <div key={permStr} className="text-xs text-slate-600 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      {permStr.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={isDeleting || isUpdating || isRegenerating}
          >
            {isRegenerating ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                {t('api_keys:actions.regenerate', 'Regenerating...')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('api_keys:actions.regenerate', 'Regenerate Key')}
              </>
            )}
          </Button>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || isUpdating || isRegenerating}
            >
              {isDeleting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {t('api_keys:detail_dialog.delete_button')}
                </>
              ) : (
                t('api_keys:detail_dialog.delete_button')
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting || isUpdating || isRegenerating}
            >
              {t('api_keys:detail_dialog.close_button')}
            </Button>
          </div>
        </div>
      </div>
    </CustomDialogV2>
  )
}
