import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Button } from '@/shared/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'

import { useForm } from 'react-hook-form'
import { z } from 'zod'

type DeleteProfileFormProps = {
  onSubmit: () => void
  isPending: boolean
  close: () => void
}

const DeleteProfileFormSchema = z
  .object({
    confirm: z.string(),
  })
  .superRefine(({ confirm }, ctx) => {
    if (confirm !== 'CONFIRM') {
      ctx.addIssue({
        code: 'custom',
        message: 'The confirmation did not match',
        path: ['confirm'],
      })
    }
  })

export const DeleteProfileForm = ({ onSubmit, isPending, close }: DeleteProfileFormProps) => {
  const form = useForm<z.infer<typeof DeleteProfileFormSchema>>({
    resolver: zodResolver(DeleteProfileFormSchema),
  })

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Please type <span className="font-bold text-red-700">CONFIRM</span> to delete.
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end mt-2 gap-2">
              {close && (
                <Button type="button" onClick={close} className="font-normal" variant={'secondary'}>
                  Cancel
                </Button>
              )}
              <LoadingButton type="submit" isLoading={isPending}>
                Confirm
              </LoadingButton>
            </div>
          </div>
        </form>
      </Form>
    </>
  )
}
