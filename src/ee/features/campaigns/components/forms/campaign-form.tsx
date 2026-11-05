'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CampaignContentType,
  campaignContentTypes,
  campaignFormSchema,
} from '@/shared/schemas/campaigns'
import { z } from 'zod'
import { Form } from '@/shared/components/ui/form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Button } from '@/shared/components/ui/button'
import { DeleteIcon, LinkIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { TouchPointType } from '@/shared/schemas/touch-points'
import { Switch } from '@/shared/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Alert } from '@/shared/components/ui/alert'
import { DatePicker } from '@/shared/components/customize/date-picker'
import { Campaign } from '@/app/api/organizations/[org_id]/campaigns/route'
import { useMemo } from 'react'
import { CustomCard } from '@/shared/components/customize/custom-card'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { DateTimePicker } from '@/shared/components/customize/date-time-picker'
// import { ScheduleList } from "@/components/schedules/schedule-list";
import { useParams } from 'next/navigation'
import { useCampaignBuilderStore } from '@/shared/stores/campaign-builder-store'

type CampaignFormProps = {
  onSubmit: (values: z.infer<typeof campaignFormSchema>) => void
  isPending: boolean
  initialData?: Campaign
  close?: () => void
}
export const CampaignForm = ({ onSubmit, isPending, initialData, close }: CampaignFormProps) => {
  const defaultValues = useMemo(() => {
    if (initialData) {
      const values = initialData as unknown as z.infer<typeof campaignFormSchema>
      return Object.fromEntries(Object.entries(values).filter(([_, value]) => value !== null))
    }
    return {
      enabled: true,
      content: { type: CampaignContentType.URL, value: '' },
    }
  }, [initialData])

  const form = useForm<z.infer<typeof campaignFormSchema>>({
    resolver: zodResolver(campaignFormSchema),
    context: { schema: campaignFormSchema },
    defaultValues,
  })
  const handleSubmit = (values: z.infer<typeof campaignFormSchema>) => {
    onSubmit(values)
  }
  return (
    <Form {...form}>
      {JSON.stringify(form.formState.errors, null, 2)}
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Campaign name" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Campaign description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enabled</FormLabel>
                <FormControl>
                  <Switch
                    className="flex"
                    checked={field.value}
                    onCheckedChange={(value) => field.onChange(value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end mt-2 gap-2">
          {close && (
            <Button type="button" onClick={close} className="font-normal">
              Cancel
            </Button>
          )}
          <LoadingButton type="submit" isLoading={isPending}>
            Save
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
