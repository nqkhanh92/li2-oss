// type TouchPointUtmDataFormProps = {

import { SingleTagSelect } from '@/shared/components/customize/single-tag-select'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import {
  popularUTMSources,
  popularUTMMediums,
} from '@/features/touch-points/constants/touch-points'
import {
  ChevronDown,
  GoalIcon,
  MousePointerClick,
  TextIcon,
  TextSearchIcon,
  Plus,
  Share2,
  Megaphone,
  Hash,
  Loader2,
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import {
  useGetUTMTemplates,
  useCreateUTMTemplate,
  useDeleteUTMTemplate,
} from '@/features/touch-points/hooks/useUTMTemplates'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { utmSchema } from '@/shared/schemas/touch-points'
import { zodResolver } from '@hookform/resolvers/zod'
import { defaultUTM } from '@/shared/constants'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/shared/components/ui/hover-card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/components/ui/empty'

type UTMTemplate = {
  name: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

type TouchPointUtmDataFormV2Props = {
  shortLink?: string
  destination: string
  close: () => void
  onSubmit: (values: z.infer<typeof utmSchema>) => void
  defaultValues?: z.infer<typeof utmSchema>
  showCloseButton?: boolean
  isLoading?: boolean
  org_id: string
}
export const TouchPointUtmDataFormV2 = ({
  shortLink,
  destination,
  close,
  onSubmit,
  defaultValues,
  showCloseButton = true,
  isLoading = false,
  org_id,
}: TouchPointUtmDataFormV2Props) => {
  const form = useForm<z.infer<typeof utmSchema>>({
    resolver: zodResolver(utmSchema),
    defaultValues: defaultValues ?? defaultUTM,
  })

  const dirtyFields = Object.keys(form.formState.dirtyFields).length
  useEffect(() => {
    if (dirtyFields > 0) {
      form.setValue('enabled', true)
    }
  }, [dirtyFields])

  const [savedUTMSource, setSavedUTMSource] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    return JSON.parse(localStorage.getItem('saved_utm_source') || '[]')
  })
  const [savedUTMMedium, setSavedUTMMedium] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    return JSON.parse(localStorage.getItem('saved_utm_medium') || '[]')
  })
  useEffect(() => {
    localStorage.setItem('saved_utm_source', JSON.stringify(savedUTMSource))
    localStorage.setItem('saved_utm_medium', JSON.stringify(savedUTMMedium))
  }, [savedUTMSource, savedUTMMedium])
  // const watchOverrideable = watch("utm_tags.overrideable");
  // const watchUtmId = watch("utm_tags.utm_id");
  const watchUtm = form.watch()

  const getExampleRedirectUrl = () => {
    if (!shortLink) return null
    const utmParams = new URLSearchParams()
    if (watchUtm?.utm_source) {
      utmParams.set('utm_source', watchUtm?.utm_source)
    }
    if (watchUtm?.utm_medium) {
      utmParams.set('utm_medium', watchUtm?.utm_medium)
    }
    if (watchUtm?.utm_campaign) {
      utmParams.set('utm_campaign', watchUtm?.utm_campaign)
    }
    if (watchUtm?.utm_term) {
      utmParams.set('utm_term', watchUtm?.utm_term)
    }
    if (watchUtm?.utm_content) {
      utmParams.set('utm_content', watchUtm?.utm_content)
    }

    // if (watchUtm?.overrideable) {
    //   const defaultUtm = '?utm_source=google&utm_medium=cpc'
    //   return {
    //     url: `${destination}${defaultUtm}`,
    //     redirect: `${shortLink}${watchUtm?.utm_id ? `` : defaultUtm}`,
    //   }
    // }

    const hasUtmId = Boolean(watchUtm?.utm_id)
    const hasCustomParams = utmParams.size > 0
    const queryString = hasCustomParams ? `?${utmParams.toString()}` : ''
    return {
      originUrl: `${destination}${hasUtmId ? '' : queryString}`,
      redirectUrl: `${shortLink}`,
    }
  }

  const exampleRedirectUrl = getExampleRedirectUrl()

  const { t } = useTranslation('advanced_custom')
  const [isOpen, setIsOpen] = useState(false)
  const utmSourceRef = useRef<HTMLDivElement>(null)

  // UTM Templates - Database integration
  const [templateComboOpen, setTemplateComboOpen] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')

  // Fetch templates from database
  const { data: templatesData, isLoading: isLoadingTemplates } = useGetUTMTemplates(org_id, {
    pagination: {
      pageIndex: 0,
      pageSize: 1000, // Get all templates for the dropdown
    },
    search: '',
    sorting: [],
    filters: {},
  })

  const createTemplateMutation = useCreateUTMTemplate(org_id)
  const deleteTemplateMutation = useDeleteUTMTemplate(org_id)

  const utmTemplates = templatesData?.data || []

  const filteredTemplates = utmTemplates.filter((template) =>
    template.name.toLowerCase().includes(templateSearch.toLowerCase())
  )

  const showSaveOption =
    templateSearch.trim() &&
    !filteredTemplates.some((t) => t.name.toLowerCase() === templateSearch.toLowerCase())

  const handleSaveTemplate = async () => {
    if (!templateSearch.trim()) return

    try {
      await createTemplateMutation.mutateAsync({
        name: templateSearch.trim(),
        utm_source: watchUtm?.utm_source || undefined,
        utm_medium: watchUtm?.utm_medium || undefined,
        utm_campaign: watchUtm?.utm_campaign || undefined,
        utm_term: watchUtm?.utm_term || undefined,
        utm_content: watchUtm?.utm_content || undefined,
      })

      toast.success(t('touchpoint:advancedSettings.utm.utmTemplates.messages.created'))
      setTemplateSearch('')
      setTemplateComboOpen(false)
    } catch (error) {
      toast.error(t('touchpoint:advancedSettings.utm.utmTemplates.messages.createError'))
    }
  }

  const handleLoadTemplate = (template: (typeof utmTemplates)[0]) => {
    if (template.utm_source) form.setValue('utm_source', template.utm_source)
    if (template.utm_medium) form.setValue('utm_medium', template.utm_medium)
    if (template.utm_campaign) form.setValue('utm_campaign', template.utm_campaign)
    if (template.utm_term) form.setValue('utm_term', template.utm_term)
    if (template.utm_content) form.setValue('utm_content', template.utm_content)
    setTemplateComboOpen(false)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplateMutation.mutateAsync(templateId)
      toast.success(t('touchpoint:advancedSettings.utm.utmTemplates.messages.deleted'))
    } catch (error) {
      toast.error(t('touchpoint:advancedSettings.utm.utmTemplates.messages.deleteError'))
    }
  }

  const handleSubmit = () => {
    form.handleSubmit(onSubmit)()
  }

  return (
    <Form {...form}>
      <div className="flex lg:flex-row flex-col gap-4">
        <div className="w-full space-y-4">
          <label className="text-[15px] font-semibold">{t('common:label.required')}</label>
          <FormField
            control={form.control}
            name="utm_source"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <div ref={utmSourceRef} className={'flex rounded-[8px] overflow-hidden'}>
                    <div className="flex-1">
                      <SingleTagSelect
                        commandPlaceholder={t('common:form.input.search_or_add')}
                        placeholder={t('touchpoint:advancedSettings.utm.fields.source.placeholder')}
                        className="rounded-l-none pl-3! border-none outline-none !bg-slate-100"
                        classNameLabel="text-slate-400"
                        value={field.value}
                        onChange={field.onChange}
                        groups={
                          savedUTMSource.length > 0
                            ? [
                                t('touchpoint:advancedSettings.utm.selectGroupLabels.saved'),
                                t('touchpoint:advancedSettings.utm.selectGroupLabels.popular'),
                              ]
                            : [t('touchpoint:advancedSettings.utm.selectGroupLabels.popular')]
                        }
                        onCreate={(value) => {
                          setSavedUTMSource([...savedUTMSource, value])
                        }}
                        onDelete={(value) => {
                          setSavedUTMSource(savedUTMSource.filter((v) => v !== value))
                        }}
                        options={[
                          ...popularUTMSources.map((source) => ({
                            value: source,
                            label: source,
                            group: t('touchpoint:advancedSettings.utm.selectGroupLabels.popular'),
                          })),
                          ...savedUTMSource.map((source) => ({
                            value: source,
                            label: source,
                            group: t('touchpoint:advancedSettings.utm.selectGroupLabels.saved'),
                            deleteable: true,
                          })),
                        ]}
                        startAdornment={
                          <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                            <Share2 className="w-5 h-5" /> Source
                          </div>
                        }
                      />
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col">
        {/* Optional Section */}
        <label className="text-[15px] font-semibold lg:block hidden">
          {t('common:label.optional')}
        </label>
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="utm_campaign"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    className="pl-0! overflow-hidden [&_input]:pl-3 gap-3 max-h-10"
                    variant="default"
                    startAdornment={
                      <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                        <GoalIcon className="w-5 h-5" /> Campaign
                      </div>
                    }
                    placeholder={t('touchpoint:advancedSettings.utm.fields.campaign.placeholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Advanced Optional */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium">
              {t('touchpoint:advancedSettings.utm.advancedOptionsLabel')}
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </CollapsibleTrigger>
            <motion.div
              initial={false}
              animate={{
                height: isOpen ? 'auto' : 0,
                opacity: isOpen ? 1 : 0,
                marginTop: isOpen ? 16 : 0,
              }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="space-y-4"
            >
              <CollapsibleContent className="overflow-hidden space-y-4">
                <FormField
                  control={form.control}
                  name="utm_medium"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <div className={'flex rounded-[8px] overflow-hidden'}>
                          <div className="flex-1">
                            <SingleTagSelect
                              commandPlaceholder={t('common:form.input.search_or_add')}
                              placeholder={t(
                                'touchpoint:advancedSettings.utm.fields.medium.placeholder'
                              )}
                              className="rounded-l-none pl-3! border-none outline-none !bg-slate-100"
                              classNameLabel="text-slate-400"
                              value={field.value}
                              onChange={field.onChange}
                              groups={
                                savedUTMMedium.length > 0
                                  ? [
                                      t('touchpoint:advancedSettings.utm.selectGroupLabels.saved'),
                                      t(
                                        'touchpoint:advancedSettings.utm.selectGroupLabels.popular'
                                      ),
                                    ]
                                  : [t('touchpoint:advancedSettings.utm.selectGroupLabels.popular')]
                              }
                              onCreate={(value) => {
                                setSavedUTMMedium([...savedUTMMedium, value])
                              }}
                              onDelete={(value) => {
                                setSavedUTMMedium(savedUTMMedium.filter((v) => v !== value))
                              }}
                              options={[
                                ...popularUTMMediums.map((medium) => ({
                                  value: medium,
                                  label: medium,
                                  group: t(
                                    'touchpoint:advancedSettings.utm.selectGroupLabels.popular'
                                  ),
                                })),
                                ...savedUTMMedium.map((medium) => ({
                                  value: medium,
                                  label: medium,
                                  group: t(
                                    'touchpoint:advancedSettings.utm.selectGroupLabels.saved'
                                  ),
                                  deleteable: true,
                                })),
                              ]}
                              startAdornment={
                                <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                                  <Megaphone className="w-5 h-5" /> Medium
                                </div>
                              }
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="utm_term"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          className="pl-0! overflow-hidden [&_input]:pl-3 gap-3 max-h-10"
                          variant="default"
                          startAdornment={
                            <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                              <Hash className="w-5 h-5" /> Term
                            </div>
                          }
                          placeholder={t('touchpoint:advancedSettings.utm.fields.term.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="utm_content"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          className="pl-0! overflow-hidden [&_input]:pl-3 gap-3 max-h-10"
                          variant="default"
                          startAdornment={
                            <div className="w-[137px]! bg-slate-200 h-10 py-2 px-4 flex gap-1 items-center text-slate-700 text-sm font-medium text-nowrap">
                              <TextIcon className="w-5 h-5" /> Content
                            </div>
                          }
                          placeholder={t(
                            'touchpoint:advancedSettings.utm.fields.content.placeholder'
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </motion.div>
          </Collapsible>
        </div>
      </div>
      {form.getValues('utm_source') && exampleRedirectUrl?.redirectUrl && (
        <div className="flex flex-col gap-3">
          <p className="text-[16px] font-semibold text-blue-600">
            {t('touchpoint:advancedSettings.utm.utmPreviewLabel')}
          </p>
          <div>
            <div className="text-[14px] text-foreground font-medium [&_span]:italic [&_span]:font-normal [&_span]:text-slate-600">
              <p>
                <span className="break-words break-all">{exampleRedirectUrl?.originUrl}</span>
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-6 justify-between items-center">
        {/* UTM Template Selector */}
        <Popover open={templateComboOpen} onOpenChange={setTemplateComboOpen}>
          <PopoverTrigger type="button" asChild>
            <Button variant="outline" type="button" className="justify-start text-left font-normal">
              <GoalIcon className="mr-2 h-4 w-4" />
              {t('touchpoint:advancedSettings.utm.actions.showUtmTemplates')}
            </Button>
          </PopoverTrigger>
          {/* Note: don't know why this shet need to add onWheel to make it scroll :v */}
          <PopoverContent
            className="w-[300px] p-0"
            align="start"
            onWheel={(e) => e.stopPropagation()}
          >
            <Command>
              <CommandInput
                placeholder={t('touchpoint:advancedSettings.utm.utmTemplates.inputPlaceholder')}
                value={templateSearch}
                onValueChange={setTemplateSearch}
              />
              <CommandList>
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <>
                    <CommandEmpty>
                      <Empty className="md:p-2 p-1">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <GoalIcon className="w-6 h-6" />
                          </EmptyMedia>
                          <EmptyTitle>
                            {t('touchpoint:advancedSettings.utm.utmTemplates.empty.title')}
                          </EmptyTitle>
                          <EmptyDescription>
                            {t('touchpoint:advancedSettings.utm.utmTemplates.empty.description')}
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={() => {
                                window.open(
                                  `/org/${org_id}/utm-templates`,
                                  '_blank',
                                  'noopener,noreferrer'
                                )
                              }}
                            >
                              {t(
                                'touchpoint:advancedSettings.utm.utmTemplates.empty.action.addUtm'
                              )}
                            </Button>
                          </div>
                        </EmptyContent>
                      </Empty>
                    </CommandEmpty>
                    <CommandGroup>
                      {showSaveOption && filteredTemplates.length === 0 && (
                        <CommandItem
                          onSelect={handleSaveTemplate}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          {t('touchpoint:advancedSettings.utm.utmTemplates.itemActions.saveAs')} "
                          {templateSearch}"
                        </CommandItem>
                      )}
                      {filteredTemplates.map((template) => (
                        <HoverCard key={template.name} openDelay={300}>
                          <HoverCardTrigger asChild>
                            <CommandItem
                              onSelect={() => handleLoadTemplate(template)}
                              className="flex items-center justify-between cursor-pointer"
                            >
                              <span>{template.name}</span>
                              <div className="flex gap-1">
                                {template.utm_source && <Share2 />}
                                {template.utm_campaign && <GoalIcon />}
                                {template.utm_medium && <Megaphone />}
                                {template.utm_term && <Hash />}
                                {template.utm_content && <TextIcon />}
                              </div>
                            </CommandItem>
                          </HoverCardTrigger>
                          <HoverCardContent side="right" className="w-80">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">{template.name}</h4>
                              <div className="text-xs space-y-1.5 text-slate-600">
                                {template.utm_source && (
                                  <div className="flex items-center gap-2">
                                    <Share2 className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">Source:</span>
                                    <span>{template.utm_source}</span>
                                  </div>
                                )}
                                {template.utm_medium && (
                                  <div className="flex items-center gap-2">
                                    <Megaphone className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">Medium:</span>
                                    <span>{template.utm_medium}</span>
                                  </div>
                                )}
                                {template.utm_campaign && (
                                  <div className="flex items-center gap-2">
                                    <GoalIcon className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">Campaign:</span>
                                    <span>{template.utm_campaign}</span>
                                  </div>
                                )}
                                {template.utm_term && (
                                  <div className="flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">Term:</span>
                                    <span>{template.utm_term}</span>
                                  </div>
                                )}
                                {template.utm_content && (
                                  <div className="flex items-center gap-2">
                                    <TextIcon className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">Content:</span>
                                    <span>{template.utm_content}</span>
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-full mt-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteTemplate(template.id)
                                }}
                                type="button"
                              >
                                {t(
                                  'touchpoint:advancedSettings.utm.utmTemplates.itemActions.delete'
                                )}
                              </Button>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Form footer */}
        <div className="flex gap-6 items-center mt-3">
          {showCloseButton && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                close()
              }}
            >
              {t('touchpoint:advancedSettings.utm.actions.discard')}
            </Button>
          )}
          <LoadingButton
            type="button"
            onClick={handleSubmit}
            className="flex-1 w-fit max-w-fit"
            isLoading={isLoading}
          >
            {t('touchpoint:advancedSettings.utm.actions.apply')}
          </LoadingButton>
        </div>
      </div>
    </Form>
  )
}
