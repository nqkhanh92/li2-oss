'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCollectionSchema, CreateCollectionInput } from '@/shared/schemas/collections'
import {
  Form,
  FormControl,
  FormField,
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
import { useTranslation } from 'react-i18next'
import {
  COLLECTION_ORG_PERMISSIONS,
  getOrgPermissionLabel,
  getOrgPermissionDescription,
} from '../../constants/collections'
import { CollectionOrgPermission } from '@/shared/types/collection.types'
import { cn } from '@/shared/lib/utils'
import { HelpCircle, Pencil, Eye, Lock, ChevronDown } from 'lucide-react'
import { ResponsivePopover } from '@/shared/components/ui/responsive-popover'
import { Button } from '@/shared/components/ui/button'

const COLLECTION_COLORS_V2 = [
  '#437EF7', // Blue (selected in design)
  '#059669', // Emerald
  '#16A34A', // Green
  '#FBBF24', // Amber
  '#FB923C', // Orange
  '#F43F5E', // Rose
  '#A21CAF', // Fuchsia
  '#9CA3AF', // Gray
  '#000000', // Black
] as const

const getPermissionIcon = (permission: CollectionOrgPermission) => {
  switch (permission) {
    case CollectionOrgPermission.CAN_EDIT:
      return <Pencil className="w-[18px] h-[18px] text-green-600" />
    case CollectionOrgPermission.CAN_VIEW:
      return <Eye className="w-[18px] h-[18px] text-blue-600" />
    case CollectionOrgPermission.NO_ACCESS:
      return <Lock className="w-[18px] h-[18px] text-semantic-warning" />
    default:
      return null
  }
}

interface CollectionFormV2Props {
  defaultValues?: Partial<CreateCollectionInput>
  onSubmit: (data: CreateCollectionInput) => void
  isPending?: boolean
  submitLabel?: string
  className?: string
  blocked?: boolean
}

export function CollectionFormV2({
  defaultValues,
  onSubmit,
  isPending = false,
  submitLabel,
  className,
  blocked = false,
}: CollectionFormV2Props) {
  const { t } = useTranslation(['common', 'collection'])

  const form = useForm<CreateCollectionInput>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      color: defaultValues?.color || COLLECTION_COLORS_V2[0],
      org_permission: defaultValues?.org_permission || CollectionOrgPermission.CAN_EDIT,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('flex flex-col gap-6', className)}>
        {/* Name and Access Mode Row */}
        <div className="flex gap-3 items-start">
          {/* Space Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="text-sm font-normal text-foreground">
                  {t('common:form.fields.name', { field: t('collection:module.collection') })}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('collection:form.name_placeholder', {
                      defaultValue: 'Enter Space Name',
                    })}
                    className="bg-slate-100 border-none rounded-md px-4 py-2 h-10 text-base placeholder:text-slate-600/50"
                    {...field}
                    disabled={blocked}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Access Mode Field */}
          <FormField
            control={form.control}
            name="org_permission"
            render={({ field }) => {
              const selectedPerm = COLLECTION_ORG_PERMISSIONS.find((p) => p.value === field.value)

              return (
                <FormItem className="w-[150px] shrink-0">
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-sm font-normal text-foreground">
                      {t('collection:form.org_permission_label')}
                    </FormLabel>
                    <ResponsivePopover
                      content={t('collection:form.org_permission_description')}
                      side="top"
                      sideOffset={8}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-4 w-4 p-0"
                      >
                        <HelpCircle className="w-4 h-4 text-slate-500" />
                      </Button>
                    </ResponsivePopover>
                  </div>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={blocked}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-slate-100 border-none rounded-md px-4 py-2 h-10">
                        <div className="flex items-center gap-2 w-full">
                          {selectedPerm && getPermissionIcon(selectedPerm.value)}
                          <span className="flex-1 text-left text-base text-foreground truncate">
                            {selectedPerm
                              ? getOrgPermissionLabel(selectedPerm.value)
                              : t('collection:form.select_permission_placeholder')}
                          </span>
                        </div>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="end" className="w-fit">
                      {COLLECTION_ORG_PERMISSIONS.map((perm) => (
                        <SelectItem
                          key={perm.value}
                          value={perm.value}
                          className="cursor-pointer data-[state=checked]:bg-accent"
                        >
                          <div className="flex items-center gap-2 py-1">
                            <span className="mt-0.5 shrink-0">{getPermissionIcon(perm.value)}</span>
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
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>

        {/* Color Picker */}
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[15px] font-normal text-slate-600">
                {t('common:form.fields.color', { defaultValue: 'Color' })}
              </FormLabel>
              <FormControl>
                <div className="flex gap-4 flex-wrap">
                  {COLLECTION_COLORS_V2.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => field.onChange(color)}
                      disabled={blocked}
                      className={cn(
                        'rounded-lg border-[1.5px] transition-all w-12 h-12',
                        field.value === color
                          ? 'border-[#081842]'
                          : 'border-slate-300 hover:border-slate-400'
                      )}
                    >
                      <div
                        className="w-full h-full rounded-xl border-8 border-white"
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        {!blocked && (
          <div className="flex justify-end">
            <LoadingButton
              type="submit"
              isLoading={isPending}
              className="bg-[#000D27] hover:bg-[#000D27]/90 text-white px-4 py-2 rounded-md text-base font-medium"
            >
              {submitLabel || t('collection:form.create_button')}
            </LoadingButton>
          </div>
        )}
      </form>
    </Form>
  )
}
