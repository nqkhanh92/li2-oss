import { Form } from '@/shared/components/ui/form'
import { assetFormSchema, AssetType } from '@/shared/schemas/assets'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { AssetColumn } from '@/features/assets/components/columns'
import { Loader2 } from 'lucide-react'
import { Switch } from '@/shared/components/ui/switch'
import { useMemo } from 'react'

export const AssetForm = ({
  onSubmit,
  isLoading,
  initialData,
}: {
  onSubmit: (values: z.infer<typeof assetFormSchema>) => void
  isLoading: boolean
  initialData?: AssetColumn
}) => {
  const defaultValues = useMemo(() => {
    if (initialData) {
      const values = initialData as unknown as z.infer<typeof assetFormSchema>
      return Object.fromEntries(Object.entries(values).filter(([_, value]) => value !== null))
    }
  }, [initialData])
  const form = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues,
  })
  const handleSubmit = (values: z.infer<typeof assetFormSchema>) => {
    onSubmit(values)
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Name" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="serial_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activate Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="Activate Code"
                  {...field}
                  value={field.value ?? ''}
                  disabled={!!initialData}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                <Select {...field} onValueChange={field.onChange} disabled={!!initialData}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AssetType.NFC}>NFC</SelectItem>
                    <SelectItem value={AssetType.DIGITAL_SIGNAGE}>DIGITAL SIGNAGE</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Enabled</FormLabel>
              <FormControl>
                <Switch
                  className="flex"
                  checked={field.value === 'enable' || field.value === undefined}
                  onCheckedChange={(checked) => field.onChange(checked ? 'enable' : 'disable')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end mt-4 gap-2">
          <LoadingButton type="submit" isLoading={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save'}
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
