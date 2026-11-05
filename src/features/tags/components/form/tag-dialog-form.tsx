'use client'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { createTagSchema } from '@/shared/schemas/tags'
import { useCreateTag, useUpdateTag } from '@/features/tags/hooks/mutations'
import CustomDialogV2, { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import { CustomColorPicker } from '@/shared/components/customize/custom-color-picker'
import { useTranslation } from 'react-i18next'
import { cn, getRandomSampleColors } from '@/shared/lib/utils'

const PRESET_COLORS = [
  '#437ef7',
  '#059669',
  '#16a34a',
  '#fbbf24',
  '#fb923c',
  '#f43f5e',
  '#a21caf',
  '#000000',
]

type TagFormValues = z.infer<typeof createTagSchema>

interface TagDialogFormProps {
  orgId: string
  mode: 'create' | 'edit'
  tagId?: string
  initialData?: { name?: string; color?: string; desc?: string | null }
  button?: React.ReactNode
  open?: boolean
  setOpen?: (open: boolean) => void
  onSuccess?: () => void
}

export const TagDialogForm = forwardRef<CustomDialogRef, TagDialogFormProps>(
  ({ orgId, mode, tagId, initialData, button, open, setOpen, onSuccess }, ref) => {
    const { t } = useTranslation()
    const { mutate: createTag, isPending: isCreating } = useCreateTag(orgId)
    const { mutate: updateTag, isPending: isUpdating } = useUpdateTag(orgId, tagId ?? '')

    const isPending = isCreating || isUpdating

    const dialogRef = useRef<CustomDialogRef>(null)
    useImperativeHandle(ref, () => ({
      open: () => dialogRef.current?.open(),
      close: () => dialogRef.current?.close(),
    }))

    const form = useForm<TagFormValues>({
      resolver: zodResolver(createTagSchema),
      defaultValues: {
        name: initialData?.name ?? '',
        color: initialData?.color ?? getRandomSampleColors(),
        desc: initialData?.desc ?? '',
      },
    })

    useEffect(() => {
      form.reset({
        name: initialData?.name ?? '',
        color: initialData?.color ?? getRandomSampleColors(),
        desc: initialData?.desc ?? '',
      })
    }, [initialData?.name, initialData?.color, initialData?.desc])

    const handleSubmit = (values: TagFormValues) => {
      if (mode === 'create') {
        createTag(values, {
          onSuccess: () => {
            form.reset()
            dialogRef.current?.close()
            onSuccess?.()
          },
        })
      } else {
        updateTag(values, {
          onSuccess: () => {
            dialogRef.current?.close()
            onSuccess?.()
          },
        })
      }
    }

    const title =
      mode === 'create'
        ? t('common:buttons.create', { field: t('common:module.tag') })
        : t('common:buttons.edit', { field: t('common:module.tag') })

    const submitLabel =
      mode === 'create'
        ? t('common:buttons.create', { field: t('common:module.tag') })
        : t('common:buttons.save_changes')

    return (
      <CustomDialogV2
        ref={dialogRef}
        title={title}
        size="sm"
        button={button}
        open={open}
        setOpen={setOpen}
        onOpenChange={setOpen}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    {t('common:form.fields.name', { field: t('common:module.tag') })}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('common:form.fields.name', { field: t('common:module.tag') })}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common:form.fields.color')}</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={cn(
                            'w-12 h-12 rounded-lg p-2 transition-colors',
                            'border-[1.5px]',
                            field.value === color
                              ? 'border-[#081842]'
                              : 'border-slate-300 hover:border-slate-400'
                          )}
                        >
                          <div
                            className="w-full h-full rounded-md"
                            style={{ backgroundColor: color }}
                          />
                        </button>
                      ))}
                      {/* Custom color picker swatch */}
                      <CustomColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        renderPicker={({ open, setOpen }) => (
                          <button
                            type="button"
                            onClick={() => setOpen(!open)}
                            className={cn(
                              'w-12 h-12 rounded-lg p-2 transition-colors',
                              'border-[1.5px]',
                              !PRESET_COLORS.includes(field.value)
                                ? 'border-[#081842]'
                                : 'border-slate-300 hover:border-slate-400'
                            )}
                          >
                            <div
                              className="w-full h-full rounded-md"
                              style={{
                                background:
                                  'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                              }}
                            />
                          </button>
                        )}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="desc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common:form.fields.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      placeholder={t('common:form.fields.description')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-1">
              <LoadingButton type="submit" isLoading={isPending}>
                {submitLabel}
              </LoadingButton>
            </div>
          </form>
        </Form>
      </CustomDialogV2>
    )
  }
)
TagDialogForm.displayName = 'TagDialogForm'
