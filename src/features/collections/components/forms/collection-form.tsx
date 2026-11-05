'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCollectionSchema, CreateCollectionInput } from '@/shared/schemas/collections'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useTranslation } from 'react-i18next'
import { COLLECTION_ORG_PERMISSIONS, COLLECTION_COLORS, getOrgPermissionLabel, getOrgPermissionDescription } from '../../constants/collections'
import { CollectionOrgPermission } from '@/shared/types/collection.types'
import { cn } from '@/shared/lib/utils'

interface CollectionFormProps {
  defaultValues?: Partial<CreateCollectionInput>
  onSubmit: (data: CreateCollectionInput) => void
  isPending?: boolean
  submitLabel?: string
  className?: string
  blocked?: boolean
}

export function CollectionForm({
  defaultValues,
  onSubmit,
  isPending = false,
  submitLabel,
  className,
  blocked = false,
}: CollectionFormProps) {
  const { t } = useTranslation(['common', 'collection'])

  const form = useForm<CreateCollectionInput>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      color: defaultValues?.color || COLLECTION_COLORS[0],
      org_permission: defaultValues?.org_permission || CollectionOrgPermission.CAN_EDIT,
    },
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('space-y-6', className)}
      >
        {/* Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('common:form.fields.name', { field: t('collection:field.collection') })}
                <span className="text-destructive ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t('collection:form.name_placeholder')}
                  {...field}
                  disabled={blocked}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('common:form.fields.description', { field: '' })}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('collection:form.description_placeholder', {
                    defaultValue: 'Describe this collection...'
                  })}
                  className="resize-none"
                  rows={3}
                  {...field}
                  disabled={blocked}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Color Picker */}
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common:form.fields.color')}</FormLabel>
              <FormControl>
                <div className="flex gap-2 flex-wrap">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => field.onChange(color)}
                      disabled={blocked}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition-all',
                        field.value === color
                          ? 'border-primary scale-110'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Organization Permission */}
        <FormField
          control={form.control}
          name="org_permission"
          render={({ field }) => {
            const selectedPerm = COLLECTION_ORG_PERMISSIONS.find(p => p.value === field.value)

            return (
              <FormItem>
                <FormLabel>
                  {t('collection:form.org_permission_label', { defaultValue: 'Organization Access' })}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={blocked}
                >
                  <FormControl>
                    <SelectTrigger className="h-auto min-h-[40px]">
                      {selectedPerm ? (
                        <div className="flex items-center gap-2 w-full">
                          <span className="flex-shrink-0">{selectedPerm.icon}</span>
                          <span className="truncate">{getOrgPermissionLabel(selectedPerm.value)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {t('collection:form.select_permission_placeholder')}
                        </span>
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="w-fit">
                    {COLLECTION_ORG_PERMISSIONS.map((perm) => (
                      <SelectItem
                        key={perm.value}
                        value={perm.value}
                        className="cursor-pointer data-[state=checked]:bg-accent"
                      >
                        <div className="flex items-start gap-2 py-1">
                          <span className="mt-0.5 flex-shrink-0">{perm.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{getOrgPermissionLabel(perm.value)}</div>
                            <div className="text-xs text-muted-foreground whitespace-normal line-clamp-2">
                              {getOrgPermissionDescription(perm.value)}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t('collection:form.org_permission_description')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        {/* Submit Button */}
        {!blocked && (
          <LoadingButton
            type="submit"
            isLoading={isPending}
            className="w-full"
          >
            {submitLabel || t('common:buttons.create', { field: t('collection:module.collection') })}
          </LoadingButton>
        )}
      </form>
    </Form>
  )
}
