import { useTranslation } from 'react-i18next'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { FancyMultiSelect } from '@/shared/components/customize/fancy-multi-select'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { MAX_TAG_LENGTH } from '@/shared/schemas/tags'
import { Control } from 'react-hook-form'
import { TouchPointFormValues } from '@/features/touch-points/hooks/use-touch-point-form'
import { TagSelect } from '@/features/tags/components/tag-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { FolderIcon, FolderOpen } from 'lucide-react'

interface TouchPointNameAndTagsProps {
  control: Control<TouchPointFormValues>
  tags: Array<{ id: string; name: string; color: string }> | undefined
  isLoadingTags: boolean
  maxTagsPerTouchPoint: number
  collections?: Array<{ id: string; name: string; color?: string | null }> | undefined
  isLoadingCollections?: boolean
}

/**
 * Touch point name and tags selection fields
 */
export const TouchPointNameAndTags = ({
  control,
  tags,
  isLoadingTags,
  maxTagsPerTouchPoint,
  collections,
  isLoadingCollections,
}: TouchPointNameAndTagsProps) => {
  const { t } = useTranslation(['common', 'touchpoint', 'collection'])

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Collection Field */}
      <FormField
        control={control}
        name="collection_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="leading-5">{t('collection:field.collection')}</FormLabel>
            <Select
              onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
              value={field.value || 'none'}
              disabled={isLoadingCollections}
            >
              <FormControl>
                <SelectTrigger className="bg-slate-100">
                  <SelectValue placeholder={t('collection:field.select_collection')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2 pl-1">
                    <FolderIcon className="w-4.5 h-4.5 text-slate-600" />
                    <span className="text-slate-600 italic opacity-50">
                      {t('collection:field.no_collection')}
                    </span>
                  </div>
                </SelectItem>
                {collections?.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    <div className="pl-1 flex items-center gap-2">
                      <FolderOpen
                        className="w-4 h-4"
                        style={{ color: collection.color || 'hsl(var(--muted-foreground))' }}
                      />
                      <span>{collection.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Tags Field */}
      <FormField
        control={control}
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="leading-5">
              {t('touchpoint:touch_point_create.form.tagSelectLabel')}
            </FormLabel>
            <FormControl>
              {/* <LoadingMask className="w-full" loading={isLoadingTags} skeleton>
                <FancyMultiSelect
                  key={`tags-select-${tags?.length}`}
                  placeholder={t('touchpoint:touch_point_create.form.tagSelectPlaceholder')}
                  maxLength={MAX_TAG_LENGTH}
                  limit={maxTagsPerTouchPoint}
                  options={
                    Array.isArray(tags)
                      ? tags.map((tag) => ({
                          label: tag.name,
                          value: tag.id,
                          color: tag.color,
                        }))
                      : []
                  }
                  variant="default"
                  {...field}
                />
              </LoadingMask> */}
              <TagSelect
                placeholder={t('touchpoint:form.placeholders.tags')}
                initialValues={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* Name Field */}
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel className="leading-5">
              {t('touchpoint:touch_point_create.form.linkNameLabel')}
            </FormLabel>
            <FormControl>
              <Input
                variant="default"
                placeholder={t('touchpoint:touch_point_create.form.linkNamePlaceholder')}
                className="bg-slate-100"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
