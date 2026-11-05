'use client'

import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { CollectionFormV2 } from './collection-form-v2'
import { Collection, CollectionOrgPermission } from '@/shared/types/collection.types'
import { useCreateCollection, useUpdateCollection } from '../../hooks/mutations'
import { CreateCollectionInput, UpdateCollectionInput } from '@/shared/schemas/collections'
import { Suspense } from 'react'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'

interface CollectionFormDialogV2Props {
  mode: 'create' | 'edit'
  collection?: Collection
  open: boolean
  onOpenChange: (open: boolean) => void
  modal?: boolean
  button?: React.ReactNode
}

export const CollectionFormDialogV2 = ({
  mode,
  collection,
  open,
  onOpenChange,
  modal = true,
  button,
}: CollectionFormDialogV2Props) => {
  const { t } = useTranslation(['collection', 'common'])
  const { org_id } = useParams<{ org_id: string }>()

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
    }
  }

  const defaultValues = collection
    ? {
        name: collection.name,
        description: collection.description || undefined,
        color: collection.color || '#437EF7',
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
      title={
        mode === 'create'
          ? t('collection:form.create_button', { defaultValue: 'Create Space' })
          : t('collection:form.edit_title')
      }
      noSeparator={false}
      button={button}
    >
      <Suspense fallback={<SkeletonCard className="w-full h-[245px]" />}>
        <CollectionFormV2
          className="pt-3"
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isPending={isPending}
          submitLabel={
            mode === 'create'
              ? t('collection:form.create_button', { defaultValue: 'Create Space' })
              : t('collection:form.update_button')
          }
        />
      </Suspense>
    </CustomDialogV2>
  )
}
