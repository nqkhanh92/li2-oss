import { channelSchema } from '@/shared/schemas/utm-campaigns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/shared/components/ui/form'
import { z } from 'zod'
import { useMemo } from 'react'
import { sampleTagColors } from '@/shared/constants/sample-data'
import { Input } from '@/shared/components/ui/input'
import { CustomColorPicker } from '@/shared/components/customize/custom-color-picker'
import { LoadingButton } from '@/shared/components/customize/loading-button'

type ChannelFormProps = {
  onSubmit: (data: z.infer<typeof channelSchema>) => void
  initialValues?: z.infer<ReturnType<typeof channelSchema.partial>>
  isLoading?: boolean
  buttonText: string
}
export const ChannelForm = ({
  onSubmit,
  initialValues,
  isLoading,
  buttonText,
}: ChannelFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialValues) {
      return {
        ...initialValues,
        color:
          initialValues.color ||
          sampleTagColors[Math.floor(Math.random() * sampleTagColors.length)],
      }
    }
    return {
      name: '',
      color: sampleTagColors[Math.floor(Math.random() * sampleTagColors.length)],
    }
  }, [initialValues])

  const form = useForm<z.infer<typeof channelSchema>>({
    resolver: zodResolver(channelSchema),
    defaultValues,
  })
  const handleSubmit = form.handleSubmit(onSubmit)

  return (
    <Form {...form}>
      <div className="space-y-4 flex flex-col">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter channel name" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <CustomColorPicker {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <LoadingButton type="button" onClick={handleSubmit} isLoading={isLoading}>
            {buttonText}
          </LoadingButton>
        </div>
      </div>
    </Form>
  )
}
