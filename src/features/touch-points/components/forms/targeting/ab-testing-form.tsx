import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { useMemo, useEffect } from 'react'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { pickDefinedAndNotNull } from '@/shared/utils'
import { useTranslation } from 'react-i18next'
import { abTestingSchema } from '@/shared/schemas/touch-points/advanced.schema'
import { Button } from '@/shared/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

const abTestingFormSchema = z.object({
  ab_testing: abTestingSchema,
})

type AbTestingFormProps = {
  onSubmit: (data: z.infer<typeof abTestingFormSchema>) => void
  isLoading?: boolean
  initialData?: z.infer<typeof abTestingFormSchema>
}

export const AbTestingForm = ({ onSubmit, isLoading, initialData }: AbTestingFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialData) {
      return pickDefinedAndNotNull(initialData)
    }
    return { ab_testing: [] }
  }, [initialData])

  const form = useForm<z.infer<typeof abTestingFormSchema>>({
    resolver: zodResolver(abTestingFormSchema),
    defaultValues: defaultValues,
  })

  const { t } = useTranslation(['touchpoint'])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'ab_testing',
  })

  const handleAddUrl = () => {
    const currentCount = fields.length
    const newPercentage = currentCount === 0 ? 100 : Math.floor(100 / (currentCount + 1))

    // Redistribute percentages evenly
    const updatedFields = fields.map((_, index) => ({
      ...form.getValues(`ab_testing.${index}`),
      percentage: newPercentage,
    }))

    // Update existing fields
    updatedFields.forEach((field, index) => {
      form.setValue(`ab_testing.${index}.percentage`, field.percentage)
    })

    append({ url: '', percentage: newPercentage })
  }

  const handleRemoveUrl = (index: number) => {
    remove(index)

    // Redistribute percentages after removal
    setTimeout(() => {
      const remainingCount = form.getValues('ab_testing').length
      if (remainingCount > 0) {
        const newPercentage = Math.floor(100 / remainingCount)
        form.getValues('ab_testing').forEach((_, idx) => {
          form.setValue(`ab_testing.${idx}.percentage`, newPercentage)
        })
      }
    }, 0)
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {/* URL List Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700">
                  {t('touchpoint:abTesting.sections.urls.title')}
                </h3>
                <p className="text-sm text-slate-500">
                  {t('touchpoint:abTesting.sections.urls.description')}
                </p>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-shrink-0 w-8 h-10 flex items-center justify-center text-sm font-medium text-slate-600">
                      {index + 1}
                    </div>
                    <FormField
                      control={form.control}
                      name={`ab_testing.${index}.url`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t('touchpoint:abTesting.fields.url.placeholder')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveUrl(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={handleAddUrl} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {t('touchpoint:abTesting.actions.addUrl')}
              </Button>
            </div>

            {/* Traffic Split Section */}
            {fields.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-700">
                    {t('touchpoint:abTesting.sections.trafficSplit.title')}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {t('touchpoint:abTesting.sections.trafficSplit.description')}
                  </p>
                </div>

                <div className="rounded-lg border p-4 bg-slate-50">
                  <div className="flex gap-2 flex-wrap">
                    {fields.map((field, index) => (
                      <FormField
                        key={field.id}
                        control={form.control}
                        name={`ab_testing.${index}.percentage`}
                        render={({ field }) => (
                          <FormItem className="flex-1 min-w-[80px]">
                            <FormLabel className="text-xs text-slate-600">{index + 1}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type="number"
                                  min={0}
                                  max={100}
                                  className="pr-8"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                  %
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormField
                    control={form.control}
                    name="ab_testing"
                    render={({ field }) => (
                      <FormItem>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-end items-center pt-4">
            <LoadingButton isLoading={isLoading} type="submit">
              {t('touchpoint:advancedSettings.linkPreview.actions.apply')}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
