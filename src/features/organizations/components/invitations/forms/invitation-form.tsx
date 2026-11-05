'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormMessage,
  FormDescription,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useGetOrgRoles } from '@/features/organizations/hooks/queries/org-roles'
import { useParams } from 'next/navigation'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { invitationCreateFormSchema } from '@/shared/schemas/invitations'
import { useEffect, useMemo } from 'react'
import { UserRoundPlus } from 'lucide-react'
import { RolePermissionsTable } from './role-permissions-table'
import { useTranslation } from 'react-i18next'

type InvitationFormProps = {
  onSubmit: (values: z.infer<typeof invitationCreateFormSchema>) => void
  close: () => void
  isPending: boolean
}
export const InvitationForm = ({ onSubmit, close, isPending }: InvitationFormProps) => {
  const { t } = useTranslation('setting')
  const { org_id } = useParams<{ org_id: string }>()
  const { data: roles, isLoading } = useGetOrgRoles(org_id)

  // Find the default role (Editor = Member)
  const defaultRole = useMemo(() => {
    return roles?.find((role) => role.name === 'Editor' && !role.is_owner_role)
  }, [roles])

  // Map backend role names to UI display names and filter out hidden roles
  const mappedRoles = roles
    ?.filter((role) => role.name !== 'Viewer') // Temporarily hidden
    ?.map((role) => {
      if (role.name === 'Editor') {
        return { ...role, name: 'Member' }
      }
      if (role.name === 'Manager') {
        return { ...role, name: 'Owner' }
      }
      return role
    })

  const form = useForm<z.infer<typeof invitationCreateFormSchema>>({
    resolver: zodResolver(invitationCreateFormSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      role_id: defaultRole?.id ?? '',
    },
  })

  // Update role_id when defaultRole becomes available
  useEffect(() => {
    if (defaultRole && !form.getValues('role_id')) {
      form.setValue('role_id', defaultRole.id)
    }
  }, [defaultRole, form])
  const handleSubmit = async (values: z.infer<typeof invitationCreateFormSchema>) => {
    onSubmit(values)
    form.reset({ email: '', role_id: defaultRole?.id ?? '' })
    close()
  }
  const watchRole = useWatch({
    control: form.control,
    name: 'role_id',
  })
  return (
    <div className="flex flex-col gap-2 w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex items-start gap-4 w-full">
          <div className="flex items-start gap-3 w-full">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('members.form.email_placeholder')}
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LoadingMask className="flex" loading={isLoading}>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger
                          className={`px-4 py-2 h-10 gap-2 items-center rounded-[8px] bg-slate-100 border-none w-full min-w-[128px]
                        outline-hidden text-slate-700 text-base font-normal leading-[24px]
                        focus:outline-hidden focus:ring-0 
                        focus-visible:ring-0`}
                        >
                          <SelectValue placeholder={t('members.actions.select_role')} />
                        </SelectTrigger>
                        <SelectContent className="text-slate-700 text-base font-normal leading-[24px]">
                          {mappedRoles
                            ?.filter((role) => !role?.is_owner_role)
                            ?.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </LoadingMask>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end gap-2">
            <LoadingButton variant="secondary" type="submit" isLoading={isPending}>
              <UserRoundPlus className="h-6! w-6!" />
              {t('members.form.invite_button')}
            </LoadingButton>
          </div>
        </form>
      </Form>
      <RolePermissionsTable roles={roles} selectedRoleId={watchRole} />
    </div>
  )
}
