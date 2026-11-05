// 'use client'
// import { Form } from '@/shared/components/ui/form'
// import { touchPointFormSchema, TouchPointType } from '@/shared/schemas/touch-points'
// import { zodResolver } from '@hookform/resolvers/zod'
// import { useForm } from 'react-hook-form'
// import { z } from 'zod'
// import {
//   FormField,
//   FormControl,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from '@/shared/components/ui/form'
// import { Input } from '@/shared/components/ui/input'
// import { LoadingButton } from '@/shared/components/customize/loading-button'
// import {
//   CheckIcon,
//   ChevronDownIcon,
//   CircleHelp,
//   CrownIcon,
//   InfoIcon,
//   Loader2,
//   Plus,
//   QrCodeIcon,
//   Sparkles,
//   XIcon,
// } from 'lucide-react'
// import { Switch } from '@/shared/components/ui/switch'
// import { useParams, useSearchParams } from 'next/navigation'
// import { GetTouchPointObject } from '@/app/api/organizations/[org_id]/touch-points/route'
// import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
// import { Button } from '@/shared/components/ui/button'
// import { FancyMultiSelect } from '@/shared/components/customize/fancy-multi-select'
// import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
// import { LoadingMask } from '@/shared/components/customize/loading-mask'
// import {
//   AllTouchPointVariants,
//   TouchPointContentType,
//   TouchPointVariants,
// } from '@/shared/types/touch-point'
// import { Card, CardContent } from '@/shared/components/ui/card'
// import { cn } from '@/shared/lib/cn'
// import { LockableSection } from '@/shared/components/customize/lockable-section'
// import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
// import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
// import { useGetCustomDomainDropdown } from '@/features/custom-domains/hooks/queries'
// import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
// import { verifyUrl } from '@/app/actions/touch-point'
// import { useDebounce } from '@/shared/hooks/use-debounce'
// import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
// import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'

// import { useTranslation } from 'react-i18next'
// import { AISlugSuggestion } from '../ai-slug-suggestion'
// import {
//   DropdownMenuTrigger,
//   DropdownMenu,
//   DropdownMenuContent,
// } from '@/shared/components/ui/dropdown-menu'
// import { MAX_TAG_LENGTH } from '@/shared/schemas/tags'

// export const TouchPointForm = ({
//   onSubmit,
//   isLoading,
//   orgQuotaMonthlyTps,
//   initialData,
// }: {
//   onSubmit: (values: z.infer<typeof touchPointFormSchema>) => void
//   isLoading: boolean
//   orgQuotaMonthlyTps: number
//   initialData?: GetTouchPointObject
// }) => {
//   // const { profile } = useProfileProvider();
//   const { orgPlan } = useOrganizationStoreProvider()
//   const { org_id }: { org_id: string } = useParams()
//   const searchParams = useSearchParams()
//   const tp_type = searchParams.get('tp_type')

//   // const { data: assets, isLoading: isLoadingAssets } =
//   //   useGetAssetDropdown(org_id);
//   const { data: tags, isLoading: isLoadingTags } = useGetTagDropdowns(org_id)
//   const { data: domains, isLoading: isLoadingDomains } = useGetCustomDomainDropdown(org_id)

//   const defaultValues = useMemo(() => {
//     if (initialData) {
//       const values = initialData as unknown as z.infer<typeof touchPointFormSchema>
//       const tags = initialData?.tp_tag_links?.map((tp_tag_link) => tp_tag_link.tag_id)
//       const filteredData = Object.fromEntries(
//         Object.entries(values).filter(([_, value]) => value !== null)
//       )
//       return { ...filteredData, tags }
//     }
//     return {
//       name: '',
//       enabled: true,
//       type: TouchPointType.LINK,
//       organization_id: org_id,
//       content_type: TouchPointContentType.URL,
//       is_campaign_based: false,
//       content_value: '',
//       tags: [],
//       variants_content: {
//         QR: {
//           enabled: tp_type === AllTouchPointVariants.QR.toLowerCase(),
//           content_value: '',
//         },
//         NFC: {
//           enabled: tp_type === AllTouchPointVariants.NFC.toLowerCase(),
//           content_value: '',
//         },
//         WIFI: {
//           enabled: tp_type === AllTouchPointVariants.WIFI.toLowerCase(),
//           content_value: '',
//         },
//       },
//     }
//   }, [initialData])
//   const form = useForm<z.infer<typeof touchPointFormSchema>>({
//     resolver: zodResolver(touchPointFormSchema),
//     // context: { schema: touchPointFormSchema },
//     defaultValues,
//   })
//   const handleSubmit = (values: z.infer<typeof touchPointFormSchema>) => {
//     if (values.variants_content?.QR?.enabled) {
//       onSubmit({
//         ...values,
//         qr_customize_options: {
//           ...QR_CUSTOMIZE_DEFAULT_OPTIONS,
//           // rawData: values.variants_content?.QR?.content_value,
//           // data: values.variants_content?.QR?.content_value,
//         },
//       })
//     } else {
//       onSubmit(values)
//     }
//   }
//   const watchVariantsContent = form.watch('variants_content')
//   const watchContentValue = form.watch('content_value')
//   const { setEnabled, back } = useFormWarningProvider()
//   useEffect(() => {
//     setEnabled(form.formState.isDirty && !form.formState.isSubmitSuccessful)
//   }, [form.formState.isDirty, form.formState.isSubmitSuccessful])

//   const [slugGenerationType, setSlugGenerationType] = useState<'random' | 'ai' | 'ai-seo' | null>(
//     'random'
//   )
//   const watchSlug = form.watch('slug')
//   const [transition, startTransition] = useTransition()
//   const [urlVerification, setUrlVerification] = useState<boolean | null>(null)
//   const debounceContentValue = useDebounce(watchContentValue, 500)
//   useEffect(() => {
//     const validUrl = touchPointFormSchema.shape.content_value.safeParse(debounceContentValue)
//     if (!validUrl.success) {
//       return setUrlVerification(null)
//     }
//     startTransition(async () => {
//       const valid = await verifyUrl(debounceContentValue)
//       setUrlVerification(valid)
//     })
//   }, [debounceContentValue])

//   useEffect(() => {
//     if (!!watchSlug) {
//       setSlugGenerationType(null)
//     }
//   }, [watchSlug])
//   const { t } = useTranslation('touchpoint')
//   const maxTpsPerMonth = useMemo(() => orgPlan?.max_tps_per_month || 0, [orgPlan])
//   const handleSlugSelect = (slug: string) => {
//     form.setValue('slug', slug)
//   }

//   const [tempSuggestSlugs, setTempSuggestSlugs] = useState<string[]>([])

//   const handleTempSuggestSlugs = (slugs: string[]) => {
//     setTempSuggestSlugs(slugs)
//   }

//   const [tab, setTab] = useState<AllTouchPointVariants>(AllTouchPointVariants.LINK)

//   return (
//     <Form {...form}>
//       <form
//         onSubmit={form.handleSubmit(handleSubmit)}
//         className="w-full items-center justify-center flex flex-col gap-0 md:overflow-y-visible overflow-y-hidden"
//       >
//         <div className="flex flex-col gap-2 justify-center items-center max-w-[700px] w-full">
//           <div className="flex flex-row items-center justify-start gap-2 text-slate-500 text-sm w-full max-w-[700px] py-1">
//             {['premium', 'premium trial'].includes(orgPlan?.name?.toLowerCase() ?? '') && (
//               <CrownIcon className="w-5 h-5 min-w-5 min-h-5" />
//             )}
//             {t('common:usage.title_display_usage', {
//               chances: maxTpsPerMonth - orgQuotaMonthlyTps,
//               object: t('common:module.touchpoint'),
//             })}
//           </div>
//           <Card
//             className={`rounded-2xl bg-white spacy-y-0 gap-6 p-6 max-w-[700px] flex-1 shadow-none border-none outline-hidden flex flex-col w-full`}
//           >
//             <CardContent className="flex flex-col gap-4 p-0">
//               <div className="flex gap-2">
//                 <FormField
//                   control={form.control}
//                   name="name"
//                   render={({ field }) => (
//                     <FormItem className="flex-1">
//                       <FormLabel>
//                         {t('common:form.fields.name', {
//                           field: t('common:module.touchpoint'),
//                         })}
//                       </FormLabel>
//                       <FormControl>
//                         <Input
//                           variant="default"
//                           placeholder={t('common:form.fields.name', {
//                             field: 'Link',
//                           })}
//                           className="bg-slate-100"
//                           {...field}
//                         />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//               </div>
//               <FormField
//                 control={form.control}
//                 name="content_value"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>{t('touch_point_create.form.destination_url')}</FormLabel>
//                     <FormControl className="py-0">
//                       <Input
//                         variant="default"
//                         placeholder="Ex: example.com"
//                         className=""
//                         {...field}
//                         endAdornment={
//                           <span className="flex">
//                             {transition ? (
//                               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                             ) : (
//                               <>
//                                 {urlVerification == true ? (
//                                   <CustomToolTip
//                                     content={t('touch_point_create.tool_tip.valid_url')}
//                                     contentClassName="bg-background border-neutral-700 text-slate-900"
//                                   >
//                                     <CheckIcon className="mr-2 h-5 w-5 text-green-500" />
//                                   </CustomToolTip>
//                                 ) : urlVerification == false ? (
//                                   <CustomToolTip
//                                     content={t('touch_point_create.tool_tip.invalid_url')}
//                                     contentClassName="bg-background border-neutral-700 text-slate-900"
//                                   >
//                                     <XIcon className="mr-2 h-5 w-5 text-red-500" />
//                                   </CustomToolTip>
//                                 ) : (
//                                   <CustomToolTip
//                                     content={t('touch_point_create.tool_tip.notification_url')}
//                                     contentClassName="bg-background border-neutral-700 text-slate-900"
//                                   >
//                                     <InfoIcon className="mr-2 h-5 w-5 text-yellow-500" />
//                                   </CustomToolTip>
//                                 )}
//                               </>
//                             )}
//                           </span>
//                         }
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <FormField
//                 control={form.control}
//                 name="tags"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>{t('touch_point_create.form.tag')}</FormLabel>
//                     <FormControl>
//                       <LoadingMask className="w-full" loading={isLoadingTags} skeleton>
//                         <FancyMultiSelect
//                           key={`tags-select-${tags?.length}`}
//                           placeholder={t('common:form.fields.add', {
//                             field: 'Tag',
//                           })}
//                           maxLength={MAX_TAG_LENGTH}
//                           limit={orgPlan?.max_tags_per_tp || 3}
//                           options={
//                             Array.isArray(tags)
//                               ? tags.map((tag) => ({
//                                   label: tag.name,
//                                   value: tag.id,
//                                   color: tag.color,
//                                 }))
//                               : []
//                           }
//                           variant="default"
//                           {...field}
//                         />
//                       </LoadingMask>
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <h2 className="text-lg font-semibold mt-2">
//                 {t('touch_point_create.form.short_link.label')}
//               </h2>
//               <div className="flex md:flex-row flex-col md:gap-2 gap-4">
//                 <div className="min-w-3/12">
//                   <LockableSection
//                     className="w-full"
//                     lockBy="plan"
//                     locked={!orgPlan || orgPlan.max_domains_per_org <= 0}
//                   >
//                     <FormField
//                       control={form.control}
//                       name="domain_id"
//                       render={({ field }) => (
//                         <FormItem className="flex flex-col gap-[6px] space-y-0">
//                           <FormLabel>{t('touch_point_create.form.short_link.domain')}</FormLabel>
//                           <FormControl>
//                             <LoadingMask className="w-full" loading={isLoadingDomains} skeleton>
//                               <SingleCommandSelect
//                                 {...field}
//                                 placeholder={process.env.NEXT_PUBLIC_SHORT_LINK_URL?.replace(
//                                   'https://',
//                                   ''
//                                 )}
//                                 options={domains?.map((domain) => ({
//                                   label: domain.name?.replace('https://', ''),
//                                   value: domain.id,
//                                 }))}
//                                 className="text-slate-500 hover:text-slate-500 shadow-none border-transparent hover:bg-slate-100 hover:border-slate-200 focus:border-slate-400"
//                                 classNameLabel="text-slate-500 hover:text-slate-500"
//                               />
//                             </LoadingMask>
//                           </FormControl>
//                           <FormMessage />
//                         </FormItem>
//                       )}
//                     />
//                   </LockableSection>
//                 </div>
//                 {/* <LockableSection lockBy="coming_soon" locked> */}
//                 <div className="max-w-9/12 w-full">
//                   <FormField
//                     control={form.control}
//                     name="slug"
//                     render={({ field }) => (
//                       <FormItem className="flex flex-col gap-[6px] space-y-0">
//                         <FormLabel>{t('touch_point_create.form.short_link.back_half')}</FormLabel>
//                         <FormControl className="py-0 max-h-10 pr-4!">
//                           <Input
//                             className="pr-0! overflow-hidden"
//                             placeholder={t('common:form.signature_slug')}
//                             {...field}
//                             endAdornment={
//                               <LockableSection lockBy="coming_soon" locked={false} variant="hover">
//                                 <DropdownMenu>
//                                   <DropdownMenuTrigger asChild className="rounded-l-none">
//                                     <Button
//                                       disabled
//                                       variant="default"
//                                       className="font-medium flex gap-1 text-base text-white bg-black hover:text-black hover:bg-secondary"
//                                     >
//                                       <Sparkles className="w-5! h-5! text-white" />
//                                       AI
//                                     </Button>
//                                   </DropdownMenuTrigger>
//                                   <DropdownMenuContent
//                                     align="end"
//                                     sideOffset={20}
//                                     className="p-0 w-full md:w-[430px] md:max-w-full max-w-full shadow-[0_4px_8px_0_rgba(5,27,68,0.08)] rounded-[6px] border-none ml-[5%] md:ml-0"
//                                   >
//                                     <AISlugSuggestion
//                                       onSlugSelect={handleSlugSelect}
//                                       url={form.watch('content_value')}
//                                       defaultSuggestSlugs={tempSuggestSlugs || []}
//                                       onSuggestSlugsChange={handleTempSuggestSlugs}
//                                     />
//                                   </DropdownMenuContent>
//                                 </DropdownMenu>
//                               </LockableSection>
//                             }
//                           />
//                         </FormControl>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                 </div>
//                 {/* </LockableSection> */}
//               </div>
//               <div className="flex flex-col items-start self-stretch gap-4 mt-2">
//                 <div className="flex flex-col items-start gap-[2px]">
//                   <span className="text-lg leading-[28px] font-semibold text-foreground">
//                     {t('touch_point_create.form.interaction_channel.label')}
//                   </span>
//                   <span className="text-sm leading-[20px] text-slate-600">
//                     {t('touch_point_create.form.interaction_channel.description')}
//                   </span>
//                 </div>
//                 {[AllTouchPointVariants.LINK].map((variant, index) => (
//                   <div
//                     key={index}
//                     className="flex px-4 py-px pl-px gap-4 self-stretch rounded-[8px] bg-slate-100"
//                   >
//                     <div
//                       key={variant}
//                       className="flex flex-col w-full px-4 py-3 gap-3 rounded-[8px] bg-white"
//                     >
//                       <div className="flex flex-col">
//                         <div className="flex items-center justify-between">
//                           <span className="text-sm font-medium text-foreground">{variant}</span>
//                           <Switch className="flex" checked={true} disabled={true} />
//                         </div>
//                       </div>
//                     </div>
//                     <CustomToolTip
//                       contentClassName="bg-background border-neutral-700 text-slate-900"
//                       side="top"
//                       content={
//                         <p className="max-w-[200px]">
//                           {t('touch_point_create.form.link_description')}
//                         </p>
//                       }
//                     >
//                       <CircleHelp size={20} className="text-blue-500" type="button" />
//                     </CustomToolTip>
//                   </div>
//                 ))}
//                 {[TouchPointVariants.QR].map((variant, index) => (
//                   <div
//                     key={index}
//                     className="flex px-4 py-px pl-px gap-4 self-stretch rounded-[8px] bg-slate-100"
//                   >
//                     <div
//                       key={variant}
//                       className="flex flex-col w-full px-4 py-3 rounded-[8px] bg-white"
//                     >
//                       <div className="flex flex-col gap-[6px]">
//                         <FormField
//                           control={form.control}
//                           name={`variants_content.${variant}.enabled`}
//                           render={({ field }) => (
//                             <FormItem className="flex flex-col">
//                               <div className="flex items-center justify-between">
//                                 <FormLabel>{variant}</FormLabel>
//                                 <FormControl>
//                                   <Switch
//                                     className="flex"
//                                     onCheckedChange={(checked) => {
//                                       field.onChange(checked)
//                                       if (
//                                         checked &&
//                                         !watchVariantsContent?.[variant]?.content_value
//                                       ) {
//                                         form.setValue(
//                                           `variants_content.${variant}.content_value`,
//                                           // @ts-ignore
//                                           watchContentValue
//                                         )
//                                       }
//                                     }}
//                                     checked={field.value}
//                                   />
//                                 </FormControl>
//                               </div>
//                               <FormMessage />
//                             </FormItem>
//                           )}
//                         />
//                         {watchVariantsContent?.[variant]?.enabled && (
//                           <FormField
//                             control={form.control}
//                             name={`variants_content.${variant}.content_value`}
//                             render={({ field }) => (
//                               <FormItem className="flex-1">
//                                 <FormControl>
//                                   <div className="relative" onClick={(e) => e.stopPropagation()}>
//                                     <Input
//                                       className={cn(
//                                         'text-slate-700 placeholder:text-slate-700 text-base font-normal'
//                                       )}
//                                       variant="default"
//                                       placeholder={t('common:form.fields.enter', {
//                                         field: 'URL',
//                                       })}
//                                       value={field.value}
//                                       onChange={field.onChange}
//                                       startAdornment={
//                                         <QrCodeIcon className="w-[18px] h-[18px] text-slate-400" />
//                                       }
//                                     />
//                                   </div>
//                                 </FormControl>
//                                 <FormMessage />
//                               </FormItem>
//                             )}
//                           />
//                         )}
//                       </div>
//                     </div>
//                     <CustomToolTip
//                       contentClassName="bg-background border-neutral-700 text-slate-900"
//                       content={
//                         <p className="max-w-[200px]">
//                           {t('touch_point_create.form.qr_description')}
//                         </p>
//                       }
//                       side="top"
//                     >
//                       <CircleHelp size={20} className="text-blue-500" type="button" />
//                     </CustomToolTip>
//                   </div>
//                 ))}
//                 {[TouchPointVariants.WIFI, TouchPointVariants.NFC].map((variant) => (
//                   <LockableSection lockBy="coming_soon" variant="blur" key={variant} locked={true}>
//                     <div className="flex px-4 py-px pl-px gap-4 self-stretch rounded-[8px] bg-slate-100 relative">
//                       <div
//                         key={variant}
//                         className="flex flex-col w-full px-4 py-3 rounded-[8px] bg-white"
//                       >
//                         <div className="flex flex-col gap-[6px]">
//                           <FormField
//                             control={form.control}
//                             name={`variants_content.${variant}.enabled`}
//                             render={({ field }) => (
//                               <FormItem className="flex flex-col">
//                                 <div className="flex items-center justify-between">
//                                   <FormLabel>{variant}</FormLabel>
//                                   <FormControl>
//                                     <Switch
//                                       className="flex"
//                                       onCheckedChange={(checked) => {
//                                         field.onChange(checked)
//                                         if (
//                                           checked &&
//                                           !watchVariantsContent?.[variant]?.content_value
//                                         ) {
//                                           form.setValue(
//                                             `variants_content.${variant}.content_value`,
//                                             // @ts-ignore
//                                             watchContentValue
//                                           )
//                                         }
//                                       }}
//                                       checked={field.value}
//                                     />
//                                   </FormControl>
//                                 </div>
//                                 <FormMessage />
//                               </FormItem>
//                             )}
//                           />
//                           {watchVariantsContent?.[variant]?.enabled && (
//                             <FormField
//                               control={form.control}
//                               name={`variants_content.${variant}.content_value`}
//                               render={({ field }) => (
//                                 <FormItem className="flex flex-col">
//                                   <FormControl>
//                                     <div className="relative" onClick={(e) => e.stopPropagation()}>
//                                       <Input
//                                         className={cn(
//                                           'text-slate-700 placeholder:text-slate-700 text-base font-normal'
//                                         )}
//                                         variant="default"
//                                         placeholder={t('common:form.fields.enter', {
//                                           field: 'URL',
//                                         })}
//                                         value={field.value}
//                                         onChange={field.onChange}
//                                         startAdornment={
//                                           <QrCodeIcon className="w-[18px] h-[18px] text-slate-400" />
//                                         }
//                                       />
//                                     </div>
//                                   </FormControl>
//                                   <FormMessage />
//                                 </FormItem>
//                               )}
//                             />
//                           )}
//                         </div>
//                       </div>
//                       <CustomToolTip
//                         content={
//                           <p className="max-w-[200px]">
//                             {t('touch_point_create.form.qr_description')}
//                           </p>
//                         }
//                         side="bottom"
//                       >
//                         <CircleHelp size={20} className="text-blue-500" type="button" />
//                       </CustomToolTip>
//                     </div>
//                   </LockableSection>
//                 ))}
//               </div>
//               <div className="flex justify-end gap-6 mt-3">
//                 <Button
//                   type="button"
//                   onClick={() => back()}
//                   variant="secondary"
//                   className={`gap-[6px] text-base flex-1 max-w-fit`}
//                 >
//                   {t('common:buttons.cancel')}
//                 </Button>
//                 <LoadingButton
//                   size={'default'}
//                   type="submit"
//                   variant={'success'}
//                   isLoading={isLoading}
//                   className="py-[8px] h-auto gap-[6px] text-white text-base flex-1 font-medium"
//                 >
//                   <Plus className="w-5! h-5!" />
//                   {t('common:buttons.create', { field: 'Link' })}
//                 </LoadingButton>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//         <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>
//       </form>
//     </Form>
//   )
// }
