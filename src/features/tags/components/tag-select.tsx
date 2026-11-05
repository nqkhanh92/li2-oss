import { MAX_TAG_LENGTH } from '@/shared/schemas/tags'
import { useTranslation } from 'react-i18next'
import { useGetTagDropdowns } from '../hooks/queries'
import { useParams } from 'next/navigation'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { FancyMultiSelect } from '@/shared/components/customize/fancy-multi-select'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { TagIcon } from 'lucide-react'
type TagSelectProps = {
  initialValues?: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export const TagSelect = ({ initialValues, onChange, placeholder }: TagSelectProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation()
  const { data: tags, isLoading: isLoadingTags } = useGetTagDropdowns(org_id)
  const { orgPlan } = useOrganizationStoreProvider()
  return (
    <>
      {isLoadingTags ? (
        <Skeleton className="w-full h-10" />
      ) : (
        <div className="relative">
          <TagIcon
            size={18}
            className="absolute bottom-0 left-4 translate-y-[-12px] text-slate-600"
          />
          <FancyMultiSelect
            className="w-full pl-[42px]"
            key={`tags-select-${tags?.length}`}
            placeholder={
              placeholder ??
              t('common:form.fields.add', {
                field: 'Tag',
              })
            }
            maxLength={MAX_TAG_LENGTH}
            limit={orgPlan?.max_tags_per_tp || 3}
            options={
              Array.isArray(tags)
                ? tags.map((tag) => ({
                    label: tag.name,
                    value: tag.id,
                    color: tag.color,
                  }))
                : []
            }
            value={initialValues}
            onChange={onChange}
          />
        </div>
      )}
    </>
  )
}
