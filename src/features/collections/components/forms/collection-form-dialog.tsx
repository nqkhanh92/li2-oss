'use client'

import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { CollectionForm } from './collection-form'
import { Collection, CollectionOrgPermission } from '@/shared/types/collection.types'
import { useCreateCollection, useUpdateCollection } from '../../hooks/mutations'
import { CreateCollectionInput, UpdateCollectionInput } from '@/shared/schemas/collections'

interface CollectionFormDialogProps {
  mode: 'create' | 'edit'
  collection?: Collection
  open: boolean
  onOpenChange: (open: boolean) => void
  modal?: boolean
}

export const CollectionFormDialog = ({
  mode,
  collection,
  open,
  onOpenChange,
  modal = true,
}: CollectionFormDialogProps) => {
  const { t } = useTranslation(['collection', 'common'])
  const { org_id } = useParams<{ org_id: string }>()

  // Use the appropriate mutation based on mode
  const createMutation = useCreateCollection(org_id)
  const updateMutation = useUpdateCollection(org_id, collection?.id || '')

  const handleSubmit = async (data: CreateCollectionInput | UpdateCollectionInput) => {
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(data as CreateCollectionInput)
      } else {
        await updateMutation.mutateAsync(data as UpdateCollectionInput)
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Collection form error:', error)
      // Error toast is handled by global React Query error handler
    }
  }

  // Convert collection to defaultValues format
  const defaultValues = collection
    ? {
        name: collection.name,
        description: collection.description || undefined,
        color: collection.color || '#3B82F6',
        org_permission: collection.org_permission as CollectionOrgPermission,
      }
    : undefined

  const isPending = mode === 'create' ? createMutation.isPending : updateMutation.isPending

  return (
    <CustomDialogV2
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      modal={modal}
      title={mode === 'create' ? t('collection:form.create_title') : t('collection:form.edit_title')}
      description={
        mode === 'create'
          ? t('collection:form.create_description')
          : t('collection:form.edit_description')
      }
    >
      <CollectionForm
        className="px-0 pb-0 w-full"
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isPending={isPending}
        submitLabel={
          mode === 'create'
            ? t('collection:form.create_button')
            : t('collection:form.update_button')
        }
      />
    </CustomDialogV2>
  )
}
