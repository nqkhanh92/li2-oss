'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  GoalIcon,
  TextIcon,
  Plus,
  Share2,
  Megaphone,
  Hash,
  Loader2,
} from 'lucide-react'
import { FormField, FormItem, FormControl, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { SingleTagSelect } from '@/shared/components/customize/single-tag-select'
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
import {
  popularUTMSources,
  popularUTMMediums,
} from '@/features/touch-points/constants/touch-points'
import {
  useGetUTMTemplates,
  useCreateUTMTemplate,
  useDeleteUTMTemplate,
} from '@/features/touch-points/hooks/useUTMTemplates'
import { toast } from 'sonner'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

export const ShortLinkUtmSection = () => {
  const { control, getValues } = useFormContext<ShortLinkFormValues>()
  const { t } = useTranslation(['touchpoint', 'common'])
  const { org_id } = useParams<{ org_id: string }>()

  const [isOpen, setIsOpen] = useState(() => {
    const v = getValues('utm_tags')
    return !!(v?.utm_medium || v?.utm_term || v?.utm_content)
  })
  const [templateComboOpen, setTemplateComboOpen] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')

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
  }, [savedUTMSource])
  useEffect(() => {
    localStorage.setItem('saved_utm_medium', JSON.stringify(savedUTMMedium))
  }, [savedUTMMedium])

  const [source, campaign, medium, term, content, destination] = useWatch({
    control,
    name: [
      'utm_tags.utm_source',
      'utm_tags.utm_campaign',
      'utm_tags.utm_medium',
      'utm_tags.utm_term',
      'utm_tags.utm_content',
      'content_value',
    ],
  })

  const previewUrl = (() => {
    if (!destination || !source) return null
    try {
      const url = new URL(destination)
      if (source) url.searchParams.set('utm_source', source)
      if (campaign) url.searchParams.set('utm_campaign', campaign)
      if (medium) url.searchParams.set('utm_medium', medium)
      if (term) url.searchParams.set('utm_term', term)
      if (content) url.searchParams.set('utm_content', content)
      return url.toString()
    } catch {
      return null
    }
  })()

  // UTM Templates
  const { data: templatesData, isLoading: isLoadingTemplates } = useGetUTMTemplates(org_id, {
    pagination: { pageIndex: 0, pageSize: 1000 },
    search: '',
    sorting: [],
    filters: {},
  })
  const createTemplateMutation = useCreateUTMTemplate(org_id)
  const deleteTemplateMutation = useDeleteUTMTemplate(org_id)
  const utmTemplates = templatesData?.data || []
  const filteredTemplates = utmTemplates.filter((t) =>
    t.name.toLowerCase().includes(templateSearch.toLowerCase())
  )
  const showSaveOption =
    templateSearch.trim() &&
    !filteredTemplates.some((t) => t.name.toLowerCase() === templateSearch.toLowerCase())

  const { setValue } = useFormContext<ShortLinkFormValues>()

  // Sync enabled flag — true if any UTM field has a value
  useEffect(() => {
    setValue('utm_tags.enabled', !!(source || campaign || medium || term || content))
  }, [source, campaign, medium, term, content, setValue])

  const handleLoadTemplate = (template: (typeof utmTemplates)[0]) => {
    if (template.utm_source)
      setValue('utm_tags.utm_source', template.utm_source, { shouldDirty: true })
    if (template.utm_medium)
      setValue('utm_tags.utm_medium', template.utm_medium, { shouldDirty: true })
    if (template.utm_campaign)
      setValue('utm_tags.utm_campaign', template.utm_campaign, { shouldDirty: true })
    if (template.utm_term) setValue('utm_tags.utm_term', template.utm_term, { shouldDirty: true })
    if (template.utm_content)
      setValue('utm_tags.utm_content', template.utm_content, { shouldDirty: true })
    setTemplateComboOpen(false)
  }

  const handleSaveTemplate = async () => {
    if (!templateSearch.trim()) return
    await createTemplateMutation.mutateAsync({
      name: templateSearch.trim(),
      utm_source: source || undefined,
      utm_medium: medium || undefined,
      utm_campaign: campaign || undefined,
      utm_term: term || undefined,
      utm_content: content || undefined,
    })
    setTemplateSearch('')
    setTemplateComboOpen(false)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    await deleteTemplateMutation.mutateAsync(templateId)
  }

  return (
    <div className="space-y-4">
      {/* Required: Source */}
      <div className="space-y-4">
        <label className="text-[15px] font-semibold">{t('common:label.required')}</label>
        <FormField
          control={control}
          name="utm_tags.utm_source"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <div className="flex rounded-[8px] overflow-hidden">
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
                      onCreate={(value) => setSavedUTMSource([...savedUTMSource, value])}
                      onDelete={(value) =>
                        setSavedUTMSource(savedUTMSource.filter((v) => v !== value))
                      }
                      options={[
                        ...popularUTMSources.map((s) => ({
                          value: s,
                          label: s,
                          group: t('touchpoint:advancedSettings.utm.selectGroupLabels.popular'),
                        })),
                        ...savedUTMSource.map((s) => ({
                          value: s,
                          label: s,
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

      {/* Optional: Campaign + Advanced */}
      <div className="flex flex-col gap-4">
        <label className="text-[15px] font-semibold">{t('common:label.optional')}</label>

        <FormField
          control={control}
          name="utm_tags.utm_campaign"
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
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-4"
          >
            <CollapsibleContent className="overflow-hidden space-y-4">
              <FormField
                control={control}
                name="utm_tags.utm_medium"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <div className="flex rounded-[8px] overflow-hidden">
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
                                    t('touchpoint:advancedSettings.utm.selectGroupLabels.popular'),
                                  ]
                                : [t('touchpoint:advancedSettings.utm.selectGroupLabels.popular')]
                            }
                            onCreate={(value) => setSavedUTMMedium([...savedUTMMedium, value])}
                            onDelete={(value) =>
                              setSavedUTMMedium(savedUTMMedium.filter((v) => v !== value))
                            }
                            options={[
                              ...popularUTMMediums.map((m) => ({
                                value: m,
                                label: m,
                                group: t(
                                  'touchpoint:advancedSettings.utm.selectGroupLabels.popular'
                                ),
                              })),
                              ...savedUTMMedium.map((m) => ({
                                value: m,
                                label: m,
                                group: t('touchpoint:advancedSettings.utm.selectGroupLabels.saved'),
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
                control={control}
                name="utm_tags.utm_term"
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
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="utm_tags.utm_content"
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
                        value={field.value ?? ''}
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

      {/* Preview */}
      {previewUrl && (
        <div className="flex flex-col gap-3">
          <p className="text-[16px] font-semibold text-blue-600">
            {t('touchpoint:advancedSettings.utm.utmPreviewLabel')}
          </p>
          <p className="text-[14px] text-foreground break-words break-all italic font-normal text-slate-600">
            {previewUrl}
          </p>
        </div>
      )}

      {/* UTM Template Selector */}
      <Popover open={templateComboOpen} onOpenChange={setTemplateComboOpen}>
        <PopoverTrigger type="button" asChild>
          <Button variant="outline" type="button" className="justify-start text-left font-normal">
            <GoalIcon className="mr-2 h-4 w-4" />
            {t('touchpoint:advancedSettings.utm.actions.showUtmTemplates')}
          </Button>
        </PopoverTrigger>
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
                        <Button
                          type="button"
                          onClick={() =>
                            window.open(
                              `/org/${org_id}/utm-templates`,
                              '_blank',
                              'noopener,noreferrer'
                            )
                          }
                        >
                          {t('touchpoint:advancedSettings.utm.utmTemplates.empty.action.addUtm')}
                        </Button>
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
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteTemplate(template.id)
                              }}
                            >
                              {t('touchpoint:advancedSettings.utm.utmTemplates.itemActions.delete')}
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
    </div>
  )
}
