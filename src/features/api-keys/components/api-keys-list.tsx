'use client'

import { useState, useMemo } from 'react'
import { Key, Bot, User, RefreshCw, Loader } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ApiKeyListItem, ApiKeyType } from '@/shared/types/api-key'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { cn } from '@/shared/lib/utils'
import { TableV2WithRef } from '@/shared/components/customize/table-v2/table'
import { ColumnDef } from '@tanstack/react-table'

interface ApiKeysListProps {
  apiKeys: ApiKeyListItem[]
  onViewDetails: (apiKey: ApiKeyListItem) => void
  onRegenerate: (id: string) => Promise<void>
  isLoading?: boolean
}

export function ApiKeysList({
  apiKeys,
  onViewDetails,
  onRegenerate,
  isLoading = false,
}: ApiKeysListProps) {
  const { t } = useTranslation(['api_keys'])
  const { confirm } = useConfirmDialog()
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  const getDisplayKey = (apiKey: ApiKeyListItem) => {
    if (apiKey.key_prefix && apiKey.key_suffix) {
      return `${apiKey.key_prefix}...${apiKey.key_suffix}`
    }
    return apiKey.key_prefix || 'N/A'
  }

  const handleRegenerate = async (apiKey: ApiKeyListItem, e: React.MouseEvent) => {
    e.stopPropagation()

    const result = await confirm({
      title: t('common:text.warning'),
      description: t(
        'api_keys:actions.confirm_regenerate',
        'The old API key will be invalidated and no longer work. This action cannot be undone.'
      ),
    })

    if (!result) return

    setRegeneratingId(apiKey.id)
    try {
      await onRegenerate(apiKey.id)
    } finally {
      setRegeneratingId(null)
    }
  }

  const columns = useMemo<ColumnDef<ApiKeyListItem>[]>(
    () => [
      {
        accessorKey: 'name',
        size: 200,
        header: () => t('api_keys:list.name_column'),
        meta: {
          skeletonRender: () => (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-muted shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="h-2.5 w-20 rounded bg-muted" />
              </div>
            </div>
          ),
        },
        cell: ({ row }) => {
          const apiKey = row.original
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
                  apiKey.key_type === ApiKeyType.BOT
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                )}
              >
                {apiKey.key_type === ApiKeyType.BOT ? (
                  <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" title={apiKey.name}>
                  {apiKey.name}
                </div>
                {apiKey.bot_user && (
                  <div
                    className="text-xs text-muted-foreground truncate"
                    title={apiKey.bot_user.display_name || apiKey.bot_user.email}
                  >
                    {apiKey.bot_user.display_name || apiKey.bot_user.email}
                  </div>
                )}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'key_prefix',
        header: () => 'API Key',
        meta: {
          skeletonRender: () => <div className="h-6 w-52 rounded bg-muted" />,
        },
        cell: ({ row }) => (
          <code className="text-xs bg-muted px-2.5 py-1.5 rounded font-mono text-foreground/75 whitespace-nowrap">
            {getDisplayKey(row.original)}
          </code>
        ),
      },
      {
        accessorKey: 'is_active',
        size: 100,
        header: () => t('api_keys:list.status_column'),
        meta: {
          skeletonRender: () => (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
          ),
        },
        cell: ({ row }) =>
          row.original.is_active ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              {t('api_keys:status.active')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
              {t('api_keys:status.inactive')}
            </span>
          ),
      },
      {
        accessorKey: 'created_at',
        size: 160,
        header: () => t('api_keys:list.created_column'),
        meta: {
          skeletonRender: () => <div className="h-3 w-24 rounded bg-muted" />,
        },
        cell: ({ row }) => (
          <span className="text-s text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
          </span>
        ),
      },
    ],
    [t]
  )

  return (
    <TableV2WithRef
      data={apiKeys}
      columns={columns}
      isLoading={isLoading}
      enableRowSelection={false}
      wrapperClassName="border border-slate-200 dark:border-slate-700 rounded-lg"
      headerClassName="bg-muted/40"
      onRowClick={(row) => onViewDetails(row.original)}
      actionsRender={(row) => (
        <div className="flex justify-end pr-1">
          <Button
            variant="outline_destructive"
            size="sm"
            onClick={(e) => handleRegenerate(row.original, e)}
            disabled={regeneratingId === row.original.id}
          >
            {regeneratingId === row.original.id ? (
              <Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            {t('api_keys:actions.regenerate', 'Regenerate')}
          </Button>
        </div>
      )}
      emptyRender={() => (
        <div className="text-center py-16">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Key className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold mb-1">{t('api_keys:list.empty_title')}</h3>
          <p className="text-s text-muted-foreground">{t('api_keys:list.empty_description')}</p>
        </div>
      )}
    />
  )
}

