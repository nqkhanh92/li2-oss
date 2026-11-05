'use client'

import { useUpdateTag } from '@/features/tags/hooks/mutations'
import { CreateTagForm } from './form/tag-form'
import { useParams } from 'next/navigation'
import { z } from 'zod'
import { updateTagSchema } from '@/shared/schemas/tags'
import { useShowTag } from '@/features/tags/hooks/queries'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { queryClient } from '@/shared/lib/react-query'

export const TagDetail = () => {
  const { tag_id, org_id } = useParams<{ tag_id: string; org_id: string }>()
  const { data: tag, isLoading: isLoadingTag } = useShowTag(org_id, tag_id)
  const { mutate: updateTag, isPending: isUpdating } = useUpdateTag(org_id, tag_id)
  const onSubmit = (values: z.infer<typeof updateTagSchema>) => {
    updateTag(values, {
      onSuccess: (values) => {
        queryClient.setQueryData(
          ['organizations', org_id, 'tag-details', tag_id],
          (old: z.infer<typeof updateTagSchema> | undefined) => {
            const newData = {
              ...old,
              ...values.data.data,
            }
            return newData
          }
        )
      },
    })
  }
  return (
    <div className="flex flex-col">
      {isLoadingTag ? (
        <Skeleton className="w-full h-[256px]" />
      ) : (
        <CreateTagForm onSubmit={onSubmit} isPending={isUpdating} initialData={tag} />
      )}
      <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>
    </div>
  )
}
