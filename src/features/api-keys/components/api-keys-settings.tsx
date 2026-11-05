'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ApiKeysList } from './api-keys-list'
import { CreateApiKeyDialog } from './create-api-key-dialog'
import { ApiKeyDetailDialog } from './api-key-detail-dialog'
import { ApiKeyCreatedDialog } from './api-key-created-dialog'
import {
  useGetApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useUpdateApiKeyStatus,
  useRegenerateApiKey,
} from '../hooks'
import { toast } from '@/shared/hooks/use-toast'
import { CreateApiKeyInput } from '@/shared/schemas/api-keys'
import { ApiKey, ApiKeyWithSecret } from '@/shared/types/api-key'
import { useTranslation } from 'react-i18next'

export function ApiKeysSettings() {
  const { t } = useTranslation(['api_keys'])
  const params = useParams()
  const orgId = params.org_id as string
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [regeneratedKey, setRegeneratedKey] = useState<ApiKeyWithSecret | null>(null)

  const { data: apiKeys = [], isLoading } = useGetApiKeys(orgId)
  const createMutation = useCreateApiKey(orgId)
  const updateStatusMutation = useUpdateApiKeyStatus(orgId)
  const deleteMutation = useDeleteApiKey(orgId)
  const regenerateMutation = useRegenerateApiKey(orgId)

  // Find the selected API key from the current data
  const selectedApiKey = selectedId ? apiKeys.find((key) => key.id === selectedId) || null : null

  const handleCreate = async (request: CreateApiKeyInput) => {
    const result = await createMutation.mutateAsync(request)
    return result
  }

  const handleUpdateStatus = async (id: string, isActive: boolean) => {
    await updateStatusMutation.mutateAsync({ keyId: id, isActive })
  }

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id)
  }

  const handleRegenerate = async (id: string) => {
    const result = await regenerateMutation.mutateAsync(id)
    setRegeneratedKey(result)
    return result
  }

  const handleRegenerateFromList = async (id: string) => {
    const result = await regenerateMutation.mutateAsync(id)
    setRegeneratedKey(result)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">{t('api_keys:description')}</p>
        </div>
        <CreateApiKeyDialog onCreateApiKey={handleCreate} />
      </div>

      <ApiKeysList
        apiKeys={apiKeys}
        isLoading={isLoading}
        onViewDetails={(apiKey) => setSelectedId(apiKey.id)}
        onRegenerate={handleRegenerateFromList}
      />

      <ApiKeyDetailDialog
        apiKey={selectedApiKey}
        open={!!selectedApiKey}
        onClose={() => setSelectedId(null)}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
        onRegenerate={handleRegenerate}
      />

      {regeneratedKey && (
        <ApiKeyCreatedDialog apiKey={regeneratedKey} onClose={() => setRegeneratedKey(null)} />
      )}
    </div>
  )
}
