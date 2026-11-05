'use client'

import { useTranslation } from 'react-i18next'
import { useWatch } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info, MousePointerClick, ScanEye, ClipboardCheck, SquarePen } from 'lucide-react'
import { createEventRuleSchema, type CreateEventRuleInput } from '@/shared/schemas/event-rules'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

type EventRuleFormProps = {
  onSubmit: (values: CreateEventRuleInput) => void
  isPending: boolean
  initialData?: Partial<CreateEventRuleInput>
  onCancel: () => void
  submitLabel?: string
  formId?: string
}

export const EventRuleForm = ({
  onSubmit,
  isPending,
  initialData,
  onCancel,
  submitLabel,
  formId,
}: EventRuleFormProps) => {
  const { t } = useTranslation('event-rules')
  const form = useForm<CreateEventRuleInput>({
    resolver: zodResolver(createEventRuleSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      trigger_type: initialData?.trigger_type ?? 'click',
      selector_path: initialData?.selector_path ?? '',
      element_text: initialData?.element_text ?? '',
      element_id: initialData?.element_id ?? '',
      element_href: initialData?.element_href ?? '',
      page_path: initialData?.page_path ?? '',
      text_match_mode: initialData?.text_match_mode ?? 'contains',
      form_id: initialData?.form_id ?? '',
      form_name: initialData?.form_name ?? '',
      form_action: initialData?.form_action ?? '',
    },
    context: { schema: createEventRuleSchema },
  })

  const triggerType = useWatch({ control: form.control, name: 'trigger_type' })
  const isFormTrigger = triggerType === 'form_submit' || triggerType === 'form_fill'
  const isVisibilityTrigger = triggerType === 'element_visibility'

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* Main content card */}
          <Card className="flex-1 min-w-0 pt-6 rounded-[8px]">
            <CardContent className="flex flex-col gap-6">
              {/* Event Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t('form.eventName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('form.eventNamePlaceholder')}
                                                {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                        }
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      {t('form.eventNameDesc')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Trigger */}
              <FormField
                control={form.control}
                name="trigger_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.trigger')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="click">
                          <span className="flex items-center gap-2">
                            <MousePointerClick className="w-4 h-4 text-[#437ef7]" />
                            {t('form.triggers.click')}
                          </span>
                        </SelectItem>
                        <SelectItem value="form_submit">
                          <span className="flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-green-600" />
                            {t('form.triggers.form_submit')}
                          </span>
                        </SelectItem>
                        <SelectItem value="form_fill">
                          <span className="flex items-center gap-2">
                            <SquarePen className="w-4 h-4 text-orange-600" />
                            {t('form.triggers.form_fill')}
                          </span>
                        </SelectItem>
                        <SelectItem value="element_visibility">
                          <span className="flex items-center gap-2">
                            <ScanEye className="w-4 h-4 text-secondary" />
                            {t('form.triggers.element_visibility')}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Divider */}
              <hr className="border-slate-200" />

              {/* Matching Criteria */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5">
                  <p className="text-s font-medium text-slate-700">{t('form.matchingCriteria')}</p>
                  <p className="text-xs text-slate-500">{t('form.matchingCriteriaDesc')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Page Path — common to all */}
                  <FormField
                    control={form.control}
                    name="page_path"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('form.pagePath')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('form.pagePathPlaceholder')}
                                                        {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-slate-500">
                          {t('form.pagePathDesc')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Element Visibility — CSS selector only */}
                  {isVisibilityTrigger && (
                    <FormField
                      control={form.control}
                      name="selector_path"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.cssSelector')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('form.cssSelectorPlaceholder')}
                                                            {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-slate-500">
                            {t('form.cssSelectorDesc')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Click-specific criteria */}
                  {!isFormTrigger && !isVisibilityTrigger && (
                    <>
                      <FormField
                        control={form.control}
                        name="selector_path"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.cssSelectorPath')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('form.cssSelectorPathPlaceholder')}
                                                                {...field}
                                value={field.value ?? ''}
                                readOnly={!!initialData?.selector_path}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-slate-500">
                              {initialData?.selector_path
                                ? t('form.cssSelectorPathPreFilled')
                                : t('form.cssSelectorPathDesc')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="element_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.elementId')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('form.elementIdPlaceholder')}
                                                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-slate-500">
                              {t('form.elementIdDesc')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="element_href"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.elementHref')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('form.elementHrefPlaceholder')}
                                                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-slate-500">
                              {t('form.elementHrefDesc')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="element_text"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.elementText')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('form.elementTextPlaceholder')}
                                                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="text_match_mode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.textMatching')}</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger >
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="contains">
                                  {t('form.textMatchingContains')}
                                </SelectItem>
                                <SelectItem value="equals">
                                  {t('form.textMatchingEquals')}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {/* Form-specific criteria */}
                  {isFormTrigger && (
                    <>
                      <FormField
                        control={form.control}
                        name="form_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.formId')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('form.formIdPlaceholder')}
                                                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-slate-500">
                              {t('form.formIdDesc')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="form_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.formName')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('form.formNamePlaceholder')}
                                                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-slate-500">
                              {t('form.formNameDesc')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="form_action"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.formAction')}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t('form.formActionPlaceholder')}
                                                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-slate-500">
                              {t('form.formActionDesc')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Retroactive notice — not applicable for visibility triggers */}
              {!isVisibilityTrigger && <div className="bg-blue-50 rounded-lg px-4 py-3 flex gap-2 items-start">
                <Info className="w-5 h-5 text-semantic-info shrink-0 mt-0.5" />
                <p className="text-s font-medium text-semantic-info">
                  {t('form.retroactiveNotice', {
                    type: isFormTrigger
                      ? t('form.retroactiveTypes.form')
                      : t('form.retroactiveTypes.click'),
                  })}
                </p>
              </div>}
            </CardContent>
          </Card>

          {/* Description card */}
          <Card className="w-full md:w-[252px] md:shrink-0 pt-6 rounded-[8px]">
            <CardContent>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('form.descriptionPlaceholder')}
                        className="border border-transparent hover:border-input shadow-none rounded-md resize-none min-h-[120px] placeholder:text-slate-600"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  )
}
