import { useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'
import {
  createUtmCampaignSchema,
  utmCampaignTouchPointSchema,
} from '@/shared/schemas/utm-campaigns'
import { v4 as uuid } from 'uuid'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import CustomDialogV2, { CustomDialogRef } from '@/shared/components/customize/custom-dialog-v2'
import { Suspense, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import {
  useGetTouchPointDropdown,
  useGetTouchPointsWithCampaign,
} from '@/features/touch-points/hooks/queries'
import { useParams } from 'next/navigation'
import { useGetCampaignChannelDropdown, useGetUtmCampaigns } from '../../hooks'
import { Edit2Icon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { Typography } from '@/shared/components/ui/typography'
import PremiumBadge from '@/features/touch-points/components/PremiumBadge'
import { usePlanFeatures } from '@/features/touch-points/hooks'
import { useTranslation } from 'react-i18next'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
import { TouchPointUtmDataFormV2 } from '@/features/touch-points/components/forms/create-new/touch-point-utm-data-form-v2'
import { MultipleCommandSelect } from '@/shared/components/customize/multiple-command-select'
import { useBulkCreateTouchPoint } from '@/features/touch-points/hooks/mutations'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { SelectTouchPoints } from '@/features/touch-points/components/select-touchpoints'
import { AddNewLinkForm } from './new-link-form'
import { Badge } from '@/shared/components/ui/badge'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/lib/cn'

export const AddLinksForm = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const [editingUTMKeys, setEditingUTMKeys] = useState<string[]>([])

  const { control } = useFormContext<z.infer<typeof createUtmCampaignSchema>>()

  const { fields, append, remove, update, replace } = useFieldArray({
    control,
    name: 'touchpoints',
  })

  const watchChannels = useWatch({
    control,
    name: 'channels',
  })
  const watchCustomizeUTM = useWatch({
    control,
    name: 'custom_utm_enabled',
  })
  const watchTouchpoints = useWatch({
    control,
    name: 'touchpoints',
  })

  const disabledTpIds: string[] = useMemo(() => {
    return watchTouchpoints?.map((tp) => tp.touchpoint_id).filter(Boolean) || []
  }, [watchTouchpoints]) as string[]

  // const { data: touchPointData, isLoading: touchPointLoading } = useGetTouchPointDropdown(org_id)
  const { data: channelData, isLoading: channelLoading } = useGetCampaignChannelDropdown(org_id)
  const { data: touchPointData, isLoading: touchPointLoading } =
    useGetTouchPointsWithCampaign(org_id)

  const channelOptions = useMemo(() => {
    return (
      channelData
        ?.filter((item) => watchChannels?.includes(item.id))
        .map((item) => ({
          value: item.id,
          label: item.name,
          color: item.color,
        })) || []
    )
  }, [channelData, fields, watchChannels])
  useEffect(() => {
    for (const field of fields) {
      if (field.channel_id && !watchChannels?.includes(field.channel_id)) {
        handleUpdateField(fields.indexOf(field), {
          channel_id: undefined,
        })
      }
    }
  }, [watchChannels])

  const utmDialogRef = useRef<CustomDialogRef>(null)
  const { enableUTM } = usePlanFeatures()
  const { t } = useTranslation(['common', 'touchpoint'])
  const handleEditUTM = (keys: string[]) => {
    setEditingUTMKeys(keys)
    utmDialogRef.current?.open()
  }
  const handleUpdateField = (
    index: number,
    field: Partial<z.infer<typeof utmCampaignTouchPointSchema>>
  ) => {
    update(index, { ...fields[index], ...field })
  }
  const newLinkDialogRef = useRef<CustomDialogRef>(null)

  const [selectedFields, setSelectedFields] = useState<string[]>([])

  const handleDeleteSelected = () => {
    if (selectedFields.length > 0) {
      const newFields = fields.filter((e) => !selectedFields.includes(e.key))
      replace(newFields)
      setSelectedFields([])
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={
              selectedFields.length > 0 && selectedFields.length === fields.length
                ? true
                : selectedFields.length > 0
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedFields(fields.map((field) => field.key))
              } else {
                setSelectedFields([])
              }
            }}
          />
          <Typography>
            Select All ({selectedFields.length}/{fields.length})
          </Typography>
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant={'ghost'}
              disabled={selectedFields.length < 1}
              onClick={handleDeleteSelected}
              title="Delete selected"
            >
              <Trash2Icon size={16} className="text-semantic-error" />
            </Button>
            {watchCustomizeUTM && (
              <Button
                type="button"
                size="icon"
                variant={'ghost'}
                disabled={selectedFields.length < 1}
                onClick={() => handleEditUTM(selectedFields)}
                title="Edit UTM for selected"
              >
                <Edit2Icon size={16} className="text-semantic-info" />
              </Button>
            )}
          </div>
        </div>
        {fields.map((field, index) => {
          return (
            <LinkItem
              index={index}
              key={field.id}
              field={field}
              allTouchpoints={touchPointData}
              enableCustomizeUTM={watchCustomizeUTM}
              onChange={(index, field) => handleUpdateField(index, field)}
              onRemove={() => remove(index)}
              channelOptions={channelOptions}
              handleEditUTM={() => handleEditUTM([field.key])}
              onSelectChange={(value) => {
                setSelectedFields((pre) => {
                  const newSet = new Set(pre)
                  if (value) {
                    newSet.add(field.key)
                  } else {
                    newSet.delete(field.key)
                  }
                  return Array.from(newSet)
                })
              }}
              selected={selectedFields.includes(field.key)}
            />
          )
        })}
        <div className="flex justify-start gap-2">
          <SelectTouchPoints
            button={
              <Button size={'sm'}>
                <PlusIcon className="h-4 w-4" />
                Add existing link
              </Button>
            }
            disabledIds={disabledTpIds}
            value={[]}
            onChange={async (value, selectedRows) => {
              if (!selectedRows) return

              for (const touchpoint of selectedRows) {
                append({
                  touchpoint_id: touchpoint.id,
                  channel_id: undefined,
                  utm_tags: touchpoint.utm_tags as z.infer<
                    typeof utmCampaignTouchPointSchema
                  >['utm_tags'],
                  type: 'existing',
                  key: uuid(),
                })
              }
            }}
          />
          <CustomDialogV2
            title="Add links"
            size={'xs'}
            button={<Button size={'sm'}>Add new links</Button>}
            ref={newLinkDialogRef}
          >
            <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
              <AddNewLinkForm
                enableCustomizeUtm={watchCustomizeUTM}
                channelOptions={channelOptions}
                onSubmit={(data) => {
                  newLinkDialogRef.current?.close()
                  for (const touchpoint of data) {
                    append(touchpoint)
                  }
                }}
              />
            </Suspense>
          </CustomDialogV2>
        </div>
      </div>
      {/* UTM Dialog */}
      <CustomDialogV2
        ref={utmDialogRef}
        title={
          !enableUTM ? (
            <PremiumBadge btnText={t('touchpoint:advancedSettings.utm.title')} />
          ) : (
            t('touchpoint:advancedSettings.utm.title')
          )
        }
        description={t('touchpoint:advancedSettings.utm.subtitle')}
        size="sm"
        showTooltip
      >
        {({ setOpen }) => (
          <Suspense fallback={<SkeletonCard className="h-[320px]" />}>
            {editingUTMKeys.length > 0 && (
              <TouchPointUtmDataFormV2
                key={`edit-utm-${editingUTMKeys}`}
                org_id={org_id}
                destination={''}
                close={() => setOpen(false)}
                onSubmit={(values) => {
                  if (editingUTMKeys.length > 0) {
                    for (const key of editingUTMKeys) {
                      const index = fields.findIndex((field) => field.key === key)
                      handleUpdateField(index, {
                        utm_tags: values,
                      })
                    }
                    setEditingUTMKeys([])
                  }
                  setOpen(false)
                }}
                defaultValues={
                  editingUTMKeys.length === 1
                    ? (fields.find((f) => f.key === editingUTMKeys[0])?.utm_tags ?? undefined)
                    : undefined
                }
              />
            )}
          </Suspense>
        )}
      </CustomDialogV2>
    </div>
  )
}

type LinkItemProps = {
  index: number
  field: z.infer<typeof utmCampaignTouchPointSchema>
  allTouchpoints: Awaited<ReturnType<typeof useGetTouchPointsWithCampaign>>['data']
  enableCustomizeUTM: boolean
  onChange: (index: number, field: Partial<z.infer<typeof utmCampaignTouchPointSchema>>) => void
  onRemove: () => void
  channelOptions: { value: string; label: string; color: string }[]
  handleEditUTM: (index: number) => void
  onSelectChange: (value: boolean) => void
  selected: boolean
}
const LinkItem = ({
  index,
  field,
  allTouchpoints,
  enableCustomizeUTM,
  onChange,
  onRemove,
  channelOptions,
  handleEditUTM,
  onSelectChange,
  selected,
}: LinkItemProps) => {
  const fieldType = field.touchpoint_id ? 'existing' : 'new'
  const touchpoint = allTouchpoints?.find((tp) => tp.id === field.touchpoint_id)
  const { control } = useFormContext<z.infer<typeof createUtmCampaignSchema>>()

  const selectedChannel = useMemo(() => {
    if (enableCustomizeUTM) {
      const utmSource = field.utm_tags?.utm_source
      if (!utmSource) return null
      const existingChannel = channelOptions.find((c) => c.label === utmSource)
      return (
        existingChannel ?? {
          label: utmSource,
        }
      )
    } else {
      if (!field.channel_id) return null
      const existingChannel = channelOptions.find((c) => c.value === field.channel_id)
      return existingChannel
    }
  }, [enableCustomizeUTM, channelOptions, field])

  return (
    <div className="flex gap-4 bg-slate-200 px-4 py-2 rounded-md relative">
      <div className="flex flex-col items-center justify-center">
        <Checkbox className="bg-white" checked={selected} onCheckedChange={onSelectChange} />
      </div>
      <div className="flex justify-between w-full">
        <div className="flex flex-col gap-1">
          {fieldType === 'existing' && (
            <div className="flex gap-1 items-center">
              <Typography className="text-nowrap truncate max-w-[200px]">
                {touchpoint?.name}
              </Typography>
              <Typography size={'xs'} className="italic text-slate-500 text-nowrap truncate">
                ({touchpoint?.content_value})
              </Typography>
            </div>
          )}
          {fieldType === 'new' && (
            <div className="flex gap-1 items-center">
              <span>
                <Badge size={'xs'} color="#008000" variant="outline">
                  New Link
                </Badge>
              </span>
              <Typography size={'xs'} className="italic text-slate-500">
                ({field.destination})
              </Typography>
            </div>
          )}
          {enableCustomizeUTM ? (
            <div className="flex items-center gap-2">
              <Badge
                onClick={() => handleEditUTM(index)}
                size={'xs'}
                className={cn('cursor-pointer flex gap-2 items-center bg-slate-500')}
              >
                {selectedChannel?.label ? (
                  `UTM Source: ${selectedChannel.label}`
                ) : (
                  <>
                    Not set<span className="text-red-500">*</span>
                  </>
                )}
                <Edit2Icon className="w-3.5 h-3.5" />
              </Badge>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              {/* <Typography size={'xs'}>
                Channel <span className="text-semantic-error">*</span>
              </Typography>
              <SingleCommandSelect
                className="pr-8 h-6!"
                value={field.channel_id ?? undefined}
                onChange={(value) =>
                  onChange(index, {
                    channel_id: value ?? undefined,
                  })
                }
                options={channelOptions}
                placeholder="Select channel"
              /> */}
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Badge
                    size={'xs'}
                    className={cn(
                      'cursor-pointer flex gap-2 items-center',
                      selectedChannel ? 'bg-slate-500' : 'bg-red-500'
                    )}
                  >
                    {selectedChannel?.label ? (
                      `Channel: ${selectedChannel.label}`
                    ) : (
                      <>
                        Not set<span className="text-red-500">*</span>
                      </>
                    )}
                    <Edit2Icon className="w-3.5 h-3.5" />
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {channelOptions.map((channel) => (
                    <DropdownMenuItem
                      key={channel.value}
                      onClick={() =>
                        onChange(index, {
                          channel_id: channel.value ?? undefined,
                        })
                      }
                    >
                      {channel.label}
                    </DropdownMenuItem>
                  ))}
                  {channelOptions.length === 0 && (
                    <DropdownMenuItem disabled>
                      Please add channels to campaign first!
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <FormField
            control={control}
            name={`touchpoints.${index}`}
            render={({ field }) => <FormMessage />}
          />
        </div>
        <div className="flex gap-2">
          <div className="w-48 mr-8">
            {/* {!enableCustomizeUTM && (
              <div>
                <Typography size={'xs'}>
                  Channel <span className="text-semantic-error">*</span>
                </Typography>
                <SingleCommandSelect
                  className="pr-8"
                  value={field.channel_id ?? undefined}
                  onChange={(value) =>
                    onChange(index, {
                      channel_id: value ?? undefined,
                    })
                  }
                  options={channelOptions}
                  placeholder="Select channel"
                />
              </div>
            )} */}
            {/* {enableCustomizeUTM && (
              <div className="flex flex-col items-end mr-4">
                <Button
                  size={'xs'}
                  type="button"
                  variant={field.utm_tags ? 'default' : 'secondary'}
                  onClick={() => handleEditUTM(index)}
                >
                  <Edit2Icon className="w-3.5 h-3.5" />
                  Edit UTM
                </Button>
              </div>
            )} */}
          </div>
          <XIcon
            className="w-4 h-4 cursor-pointer absolute top-2 right-2 text-semantic-error"
            onClick={onRemove}
          />
        </div>
      </div>
    </div>
  )
}
