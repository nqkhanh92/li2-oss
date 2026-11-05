// 'use client'

// import {
//   touchPointFormSchema,
//   TouchPointType,
//   touchPointUpdateSchema,
// } from '@/shared/schemas/touch-points'
// import { zodResolver } from '@hookform/resolvers/zod'
// import { useForm } from 'react-hook-form'
// import { z } from 'zod'
// import {
//   Form,
//   FormField,
//   FormControl,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from '@/shared/components/ui/form'
// import { Input } from '@/shared/components/ui/input'
// import { LoadingButton } from '@/shared/components/customize/loading-button'
// import {
//   CalendarIcon,
//   Copy,
//   Link2,
//   Loader2,
//   PenLine,
//   QrCodeIcon,
//   Trash,
//   UserRoundPen,
//   Wifi,
// } from 'lucide-react'
// import { useParams, useRouter, useSearchParams } from 'next/navigation'
// import { GetTouchPointObject } from '@/app/api/organizations/[org_id]/touch-points/route'
// import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
// import { useGetAssetDropdown } from '@/features/assets/hooks/queries'
// import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
// import { Button } from '@/shared/components/ui/button'
// import { FancyMultiSelect } from '@/shared/components/customize/fancy-multi-select'
// import { useGetTagDropdowns } from '@/features/tags/hooks/queries'
// import { LoadingMask } from '@/shared/components/customize/loading-mask'
// import {
//   AllTouchPointVariants,
//   TouchPointContentType,
//   TouchPointVariants,
// } from '@/shared/types/touch-point'
// import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
// import { cn } from '@/shared/lib/cn'
// import { useDeleteTouchPoint } from '@/features/touch-points/hooks/mutations'
// import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
// import { Textarea } from '@/shared/components/ui/textarea'
// import { LockableSection } from '@/shared/components/customize/lockable-section'
// // import { toast } from "@/hooks/use-toast";
// import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
// import { ExtendedOptions } from '../customize-tool/qr-tool'
// import { useQrContext } from '@/shared/providers/qr-customize-provider'
// import { defaultMetaTags } from '@/shared/constants'
// import { QrLogoComponentCustomize, QrLogoRef } from '../customize-tool/qr-logo-component-customize'
// import QRCodeStyling, { FileExtension } from 'qr-code-styling'
// import {
//   availableQrOptions,
//   createExtensionWithBase64Logo,
// } from '@/features/touch-points/constants/qr'
// import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'

// import { TouchPointShortLinkForm } from './touch-point-shortlink-form'
// import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
// import { isValidImageUrl } from '@/shared/utils/image-validator'
// import { FormSwitchHeaderTable } from './form-switch-header'
// import { FormControlSwitch } from './form-control-swith'
// import { QrActionsPopover } from './qr-action-popover'
// import { useTranslation } from 'react-i18next'
// import { toast } from 'sonner'
// import dayjs from '@/shared/lib/dayjs'
// import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/shared/components/ui/drawer'
// import { QrCodePreview, QrCodePreviewRef } from '../customize-tool/qr-code-preview'
// import { MAX_TAG_LENGTH } from '@/shared/schemas/tags'
// import { SkeletonCard } from '@/shared/components/customize/skeleton-card'

// export const TouchPointFormDetail = ({
//   onSubmit,
//   isUpdating,
//   initialData,
//   active,
// }: {
//   onSubmit: (values: z.infer<typeof touchPointUpdateSchema>) => void
//   isUpdating: boolean
//   initialData?: GetTouchPointObject
//   active: boolean | null
// }) => {
//   const { qrOptions, setQrOptions } = useQrContext()
//   //#region Queries
//   const qrRef = useRef<QrCodePreviewRef>(null)
//   const {
//     org_id,
//     touch_point_id,
//   }: { org_id: string; location_id: string; touch_point_id: string } = useParams()
//   const [isLoading, setIsLoading] = useState<boolean>(false)
//   const { data: assets, isLoading: isLoadingAssets } = useGetAssetDropdown(org_id)
//   const { data: tags, isLoading: isLoadingTags } = useGetTagDropdowns(org_id)
//   const { orgPlan } = useOrganizationStoreProvider()
//   const logoRef = useRef<QrLogoRef>(null)
//   const { push: routerPush } = useRouter()

//   //#region Form handle
//   const defaultValues = useMemo(() => {
//     if (initialData) {
//       const values = initialData as unknown as z.infer<typeof touchPointFormSchema>
//       const tags = initialData?.tp_tag_links?.map((tp_tag_link) => tp_tag_link.tag_id)
//       const filteredData = Object?.fromEntries(
//         Object?.entries(values)?.filter(([_, value]) => value !== null)
//       )
//       return { ...filteredData, tags }
//     }
//     return {
//       name: '',
//       enabled: true,
//       domain_id: '',
//       slug: '',
//       type: TouchPointType.LINK,
//       organization_id: org_id,
//       content_type: TouchPointContentType.URL,
//       is_campaign_based: false,
//       content_value: '',
//       tags: [],
//       qr_customize_options: {},
//       meta_tags: defaultMetaTags,
//       utm_tags: {},
//     }
//   }, [initialData])
//   const form = useForm<z.infer<typeof touchPointUpdateSchema>>({
//     resolver: zodResolver(touchPointUpdateSchema),
//     defaultValues,
//   })
//   // const watchType = form.watch("type");

//   const handleSubmit = (values: z.infer<typeof touchPointUpdateSchema>) => {
//     onSubmit({
//       ...values,
//       qr_customize_options: qrOptions,
//     })
//   }

//   const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

//   useEffect(() => {
//     if (!initialData) {
//       return
//     }
//     const setupQrOptions = async () => {
//       let qrLogoImage: string | undefined = undefined
//       setIsLoading(true)
//       if (initialData.qr_customize_options) {
//         qrLogoImage = (initialData.qr_customize_options as ExtendedOptions).image
//       }
//       const [isValidImage, isError] = await isValidImageUrl(qrLogoImage || '')
//       if (isError) {
//         toast.error('Something went wrong', {
//           description: 'Error when loading QR logo image',
//         })
//       }
//       const imageOption = isValidImage && qrLogoImage ? { image: qrLogoImage } : { image: '' }
//       const isEmptyCustomizeOptions =
//         !initialData.qr_customize_options ||
//         Object.keys(initialData.qr_customize_options).length === 0
//       // normalize numeric fields
//       const normalizeOptions = (options: ExtendedOptions): ExtendedOptions => {
//         return {
//           ...options,
//           width: options.width ? Number(options.width) : undefined,
//           height: options.height ? Number(options.height) : undefined,
//           imageOptions: options.imageOptions
//             ? {
//                 ...options.imageOptions,
//                 margin: options.imageOptions.margin
//                   ? Number(options.imageOptions.margin)
//                   : undefined,
//                 imageSize: options.imageOptions.imageSize
//                   ? Number(options.imageOptions.imageSize)
//                   : undefined,
//               }
//             : undefined,
//         }
//       }
//       // final options
//       const finalOptions = isEmptyCustomizeOptions
//         ? {
//             ...QR_CUSTOMIZE_DEFAULT_OPTIONS,
//             data: `${process.env.NEXT_PUBLIC_SHORT_LINK_URL}/${initialData.short_code}?t=1`,
//             ...imageOption,
//           }
//         : {
//             ...normalizeOptions(initialData.qr_customize_options as ExtendedOptions),
//             ...imageOption,
//           }

//       setQrOptions(finalOptions)
//       setIsLoading(false)
//     }
//     setupQrOptions()
//   }, [initialData?.qr_customize_options])

//   useEffect(() => {
//     if (active !== null) {
//       if (active !== initialData?.enabled) {
//         form.setValue('enabled', active, { shouldDirty: true })
//       } else {
//         form.setValue('enabled', active)
//       }
//     }
//   }, [active])

//   const watchVariantsContent = form.watch('variants_content')
//   const watchContentValue = form.watch('content_value')

//   const watchCampaignBased = form.watch('is_campaign_based')

//   const { mutate: deleteTouchPoint, isPending: isDeletingTouchPoint } = useDeleteTouchPoint(org_id)

//   const deleteFormRef = useRef<DialogCustomRef>(null)

//   const handleDownloadQrCode = async (
//     qr_customize_options: ExtendedOptions,
//     tp_name: string,
//     short_code: string,
//     option?: { fileType: FileExtension; fileSize: number }
//   ) => {
//     if (!isSafari) {
//       if (!qrRef.current) return toast.warning('QR data is not found')
//       qrRef.current?.download(
//         tp_name,
//         qr_customize_options.data
//           ? qr_customize_options.data
//           : `${process.env.NEXT_PUBLIC_SHORT_LINK_URL}/${short_code}?t=1`,
//         option?.fileType,
//         option?.fileSize
//       )
//     } else {
//       if (!qr_customize_options) return toast.warning('QR data is not found')
//       const downloadQr = new QRCodeStyling({
//         ...qr_customize_options,
//         data: qr_customize_options.data
//           ? qr_customize_options.data
//           : `${process.env.NEXT_PUBLIC_SHORT_LINK_URL}/${short_code}?t=1`,
//         width: option?.fileSize || 512,
//         height: option?.fileSize || 512,
//         image: qr_customize_options.image,
//         imageOptions: {
//           ...qr_customize_options.imageOptions,
//         },
//       })
//       downloadQr.applyExtension(await createExtensionWithBase64Logo())
//       setTimeout(() => {
//         downloadQr.download({
//           extension: option?.fileType || 'png',
//           name: tp_name,
//         })
//       }, 100)
//     }
//   }

//   const { t } = useTranslation('touchpoint')

//   //Alert when form is dirty
//   const { setEnabled, back } = useFormWarningProvider()
//   const isDirtyAlt = useMemo(() => {
//     return !!Object.keys(form.formState.dirtyFields).length
//   }, [form.formState])

//   useEffect(() => {
//     setEnabled(isDirtyAlt && !form.formState.isSubmitSuccessful)
//     if (active !== null && defaultValues && active !== defaultValues.enabled) {
//       setEnabled(true)
//     }
//   }, [isDirtyAlt, form.formState.isSubmitSuccessful, active])

//   const [destinationEnabled, setDestinationEnabled] = useState(false)
//   const [campaignEnabled, setCampaignEnabled] = useState(false)

//   const utmSetupRef = useRef<DialogCustomRef>(null)
//   const editLinkFormRef = useRef<DialogCustomRef>(null)

//   const handleDelete = () => {
//     deleteTouchPoint(touch_point_id, {
//       onSuccess: () => {
//         routerPush(`/org/${org_id}/touch-points`)
//       },
//     })
//   }

//   const type = useSearchParams().get('type')
//   return (
//     <>
//       <Form {...form}>
//         <form onSubmit={form.handleSubmit(handleSubmit)}>
//           <div className="flex flex-col gap-4">
//             <div className={`grid grid-cols-3 grid-rows-[auto_auto_auto] gap-x-6 gap-y-6`}>
//               <div className="col-span-3 lg:col-span-2">
//                 <Card
//                   className={`rounded-2xl bg-white space-y-0 gap-6 p-6 flex flex-col shadow-none border-none`}
//                 >
//                   <CardContent className="flex flex-col gap-4 p-0">
//                     <div className="flex gap-2">
//                       <FormField
//                         control={form.control}
//                         name="name"
//                         render={({ field }) => (
//                           <FormItem className="flex-1 gap-1">
//                             <FormLabel>{t('common:form.fields.name', { field: '' })}:</FormLabel>
//                             <FormControl>
//                               <Input
//                                 variant="default"
//                                 placeholder={t('common:form.fields.name', {
//                                   field: 'Link',
//                                 })}
//                                 {...field}
//                               />
//                             </FormControl>
//                             <FormMessage />
//                           </FormItem>
//                         )}
//                       />
//                     </div>
//                     {initialData && (
//                       <div className="flex gap-4 items-end">
//                         <FormItem className="flex-1 gap-1">
//                           <FormLabel>{t('touch_point_create.form.short_link.label')}:</FormLabel>
//                           <div className="flex gap-2">
//                             <Input
//                               disabled
//                               variant="default"
//                               value={initialData.short_url}
//                               className="bg-neutral-500! text-foreground overflow-hidden max-h-10"
//                               endAdornment={
//                                 <Button
//                                   variant="link"
//                                   className="text-slate-400"
//                                   size="icon"
//                                   type="button"
//                                   onClick={() => {
//                                     navigator.clipboard.writeText(initialData.short_url)
//                                     toast.success(t('common:toast.title_copy'), {
//                                       description: t('common:toast.description_copy', {
//                                         field: '$t(common:label.short_link)',
//                                       }),
//                                     })
//                                   }}
//                                 >
//                                   <Copy className="h-6! w-6!" />
//                                 </Button>
//                               }
//                             />
//                           </div>
//                         </FormItem>
//                         <Button
//                           type="button"
//                           className="p-2! md:flex hidden"
//                           variant="table"
//                           onClick={() => editLinkFormRef.current?.open()}
//                         >
//                           <PenLine className="w-6! h-6!" />
//                         </Button>
//                         <Drawer>
//                           <DrawerTrigger>
//                             <Button type="button" className="p-2! md:hidden" variant="table">
//                               <PenLine className="w-6! h-6!" />
//                             </Button>
//                           </DrawerTrigger>
//                           <DrawerContent className="px-9 py-6 rounded-2xl rounded-b-none flex flex-col gap-6">
//                             <DrawerTitle>
//                               {t('common:buttons.edit', { field: t('common:label.short_link') })}
//                             </DrawerTitle>
//                             <TouchPointShortLinkForm
//                               initialData={{
//                                 // domain_id: defaultValues.domain_id,
//                                 slug: initialData?.slug || '',
//                                 content_value: defaultValues.content_value,
//                                 suggested_slugs: initialData?.suggested_slugs || [],
//                               }}
//                               onFinish={close}
//                             />
//                           </DrawerContent>
//                         </Drawer>
//                       </div>
//                     )}
//                   </CardContent>
//                 </Card>
//               </div>
//               <Card className="col-span-3 lg:col-span-1 lg:row-span-3">
//                 <CardHeader className="py-6 pb-4">
//                   <div className="flex flex-col gap-4">
//                     <span className="text-lg font-semibold leading-[28px] text-foreground">
//                       {t('common:text.more_info')}
//                     </span>
//                     <div className="flex flex-col items-start gap-1">
//                       <div className="flex gap-1 items-center text-gray-50 text-ellipsis overflow-hidden font-normal text-sm">
//                         <CalendarIcon className="w-3 h-3" />
//                         {initialData?.created_at
//                           ? dayjs(initialData.created_at).format('MMMM DD, YYYY')
//                           : 'N/A'}
//                       </div>
//                       <div className="flex gap-1 items-center text-gray-50 text-ellipsis overflow-hidden font-normal text-sm">
//                         <UserRoundPen className="w-3 h-3" />
//                         {initialData?.profiles?.email || 'User'}
//                       </div>
//                     </div>
//                   </div>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="flex flex-col gap-4">
//                     <FormField
//                       control={form.control}
//                       name="tags"
//                       render={({ field }) => (
//                         <FormItem>
//                           <FormLabel>{t('touch_point_create.form.tag')}</FormLabel>
//                           <FormControl>
//                             <LoadingMask className="w-full" loading={isLoadingTags} skeleton>
//                               <div>
//                                 <FancyMultiSelect
//                                   maxLength={MAX_TAG_LENGTH}
//                                   key={`tags-select-${tags?.length}`}
//                                   placeholder={t('common:form.fields.add', {
//                                     field: 'Tag',
//                                   })}
//                                   limit={orgPlan?.max_tags_per_tp || 3}
//                                   options={(Array.isArray(tags) ? tags : [])?.map((tag) => ({
//                                     label: tag.name,
//                                     value: tag.id,
//                                     color: tag.color,
//                                   }))}
//                                   variant="default"
//                                   {...field}
//                                 />
//                               </div>
//                             </LoadingMask>
//                           </FormControl>
//                           <FormMessage />
//                         </FormItem>
//                       )}
//                     />
//                     <FormField
//                       control={form.control}
//                       name="desc"
//                       render={({ field }) => (
//                         <FormItem>
//                           <FormLabel>{t('touch_point_create.form.description')}</FormLabel>
//                           <FormControl>
//                             <Textarea
//                               variant="default"
//                               placeholder={t('touch_point_create.form.description')}
//                               className="border-transparent focus-within:border focus-within:border-slate-400"
//                               {...field}
//                             />
//                           </FormControl>
//                           <FormMessage />
//                         </FormItem>
//                       )}
//                     />
//                   </div>
//                 </CardContent>
//               </Card>
//               <div className="col-span-3 lg:col-span-2 lg:row-span-2 flex flex-col gap-6">
//                 <Card
//                   className={`rounded-2xl bg-white spacy-y-0 gap-6 p-6 flex flex-col shadow-none border-none`}
//                 >
//                   <CardContent className="flex flex-col gap-3 p-0">
//                     <div className="flex flex-col items-start self-stretch gap-4">
//                       <div className="flex flex-col items-start gap-[2px]">
//                         <span className="text-lg leading-[28px] font-semibold text-foreground">
//                           {t('touch_point_create.form.interaction_channel.label')}
//                         </span>
//                         <span className="text-sm leading-[20px] text-slate-600">
//                           {t('touch_point_create.form.interaction_channel.description')}
//                         </span>
//                       </div>
//                       {[AllTouchPointVariants.LINK].map((variant) => (
//                         <div
//                           key={variant}
//                           className="flex flex-col w-full gap-1 rounded-[8px] bg-white border border-neutral-700 px-4 py-3"
//                         >
//                           <FormSwitchHeaderTable
//                             variant={variant}
//                             title={t('touch_point_create.form.destination_url')}
//                             defaultChecked={true}
//                             disabled={true}
//                             checked={true}
//                           />
//                           <FormField
//                             control={form.control}
//                             name={`content_value`}
//                             render={({ field }) => (
//                               <FormItem className="flex-1 gap-2">
//                                 <FormControl>
//                                   <Input
//                                     className={cn(
//                                       'text-slate-700! placeholder:text-slate-700 text-base font-normal focus-within:border focus:border max-h-10'
//                                     )}
//                                     startAdornment={
//                                       <Link2 className="w-[18px] h-[18px] text-slate-400" />
//                                     }
//                                     variant="default"
//                                     placeholder={t('common:form.fields.enter', {
//                                       field: 'Url',
//                                     })}
//                                     value={field.value}
//                                     onChange={field.onChange}
//                                   />
//                                 </FormControl>
//                                 <FormMessage />
//                               </FormItem>
//                             )}
//                           />
//                         </div>
//                       ))}
//                       {[TouchPointVariants.QR]?.map((variant) => (
//                         <div
//                           key={variant}
//                           className="flex flex-col w-full gap-3 rounded-[8px] bg-white border border-neutral-700"
//                         >
//                           <div className="flex flex-col w-full px-4 py-3 gap-3">
//                             <FormField
//                               control={form.control}
//                               name={`variants_content.${variant}.enabled`}
//                               render={({ field }) => (
//                                 <FormItem className="flex flex-col">
//                                   <FormControlSwitch
//                                     variant={variant}
//                                     field={field}
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
//                                   />
//                                   <FormMessage />
//                                 </FormItem>
//                               )}
//                             />
//                             {watchVariantsContent?.[variant]?.enabled && (
//                               <FormField
//                                 control={form.control}
//                                 name={`variants_content.${variant}.content_value`}
//                                 render={({ field }) => (
//                                   <FormItem className="flex-1 gap-2">
//                                     <FormControl>
//                                       <div className="flex md:flex-row flex-col gap-6 md:px-6 px-0 py-4 pr-0">
//                                         <div className="flex items-center justify-between flex-col w-auto gap-3">
//                                           {initialData?.short_url && (
//                                             <div
//                                               className={cn(
//                                                 'w-[168px] h-[168px] p-0! rounded-[8px] border border-neutral-700 overflow-hidden flex justify-center items-center',
//                                                 isLoading && 'opacity-50'
//                                               )}
//                                             >
//                                               {isLoading ? (
//                                                 <Loader2 className="w-5 h-5 animate-spin text-primary" />
//                                               ) : (
//                                                 <QrCodePreview size={168} ref={qrRef} />
//                                               )}
//                                             </div>
//                                           )}
//                                           <QrLogoComponentCustomize
//                                             className="w-full"
//                                             ref={logoRef}
//                                           />
//                                         </div>
//                                         <div className="flex flex-col gap-4 w-full">
//                                           <div className="flex items-start justify-start gap-4 self-stretch">
//                                             <QrActionsPopover
//                                               qrRef={qrRef}
//                                               shortUrl={initialData?.short_code || ''}
//                                               tp_name={initialData?.name || ''}
//                                               availableQrOptions={availableQrOptions}
//                                               handleDownloadQrCode={handleDownloadQrCode}
//                                               close={() => {}}
//                                             />
//                                           </div>
//                                           <div className="flex flex-col justify-center gap-1 w-full">
//                                             <span className="text-sm text-foreground font-medium">
//                                               {t('touch_point_create.form.destination_url')}
//                                             </span>
//                                             <div
//                                               className="relative"
//                                               onClick={(e) => e.stopPropagation()}
//                                             >
//                                               <Input
//                                                 className={cn(
//                                                   'text-slate-700 placeholder:text-slate-700 text-base font-normal w-full max-h-10'
//                                                 )}
//                                                 variant="default"
//                                                 placeholder={t('common:form.fields.enter', {
//                                                   field: 'Url',
//                                                 })}
//                                                 value={field.value}
//                                                 onChange={field.onChange}
//                                                 startAdornment={
//                                                   <QrCodeIcon className="w-[18px] h-[18px] text-slate-400" />
//                                                 }
//                                               />
//                                             </div>
//                                             <FormMessage />
//                                           </div>
//                                         </div>
//                                       </div>
//                                     </FormControl>
//                                   </FormItem>
//                                 )}
//                               />
//                             )}
//                           </div>
//                         </div>
//                       ))}
//                       <div className="w-full gap-4 flex flex-col">
//                         {[TouchPointVariants.WIFI, TouchPointVariants.NFC]?.map(
//                           (variant, index) => {
//                             return (
//                               <LockableSection
//                                 locked={true}
//                                 action={() => {}}
//                                 variant="blur"
//                                 lockBy="coming_soon"
//                                 key={index}
//                                 className="w-auto"
//                                 lockText={t('common:text.coming_soon')}
//                               >
//                                 <div className="flex flex-col w-full px-4 py-3 border border-slate-100 gap-3 rounded-[8px] bg-white relative">
//                                   <div className="flex flex-col">
//                                     <FormField
//                                       control={form.control}
//                                       name={`variants_content.${variant}.enabled`}
//                                       disabled
//                                       render={({ field }) => (
//                                         <FormItem className="flex flex-col">
//                                           <FormControlSwitch
//                                             variant={variant}
//                                             field={field}
//                                             onCheckedChange={field.onChange}
//                                           />
//                                           <FormMessage />
//                                         </FormItem>
//                                       )}
//                                     />
//                                     {watchVariantsContent?.[variant]?.enabled &&
//                                       variant === TouchPointVariants.WIFI && (
//                                         <div className="flex flex-col space-y-3">
//                                           <FormField
//                                             control={form.control}
//                                             name={`variants_content.${variant}.content_value`}
//                                             disabled
//                                             render={({ field }) => (
//                                               <FormItem className="flex-1">
//                                                 <FormControl>
//                                                   <div
//                                                     className="relative"
//                                                     onClick={(e) => e.stopPropagation()}
//                                                   >
//                                                     <Input
//                                                       className={cn(
//                                                         'pl-10 text-slate-700 placeholder:text-slate-700 text-base font-normal'
//                                                       )}
//                                                       variant="default"
//                                                       placeholder="Input Short link"
//                                                       value={field.value}
//                                                       onChange={field.onChange}
//                                                       startAdornment={
//                                                         <Link2 className="w-[18px] h-[18px] text-slate-400" />
//                                                       }
//                                                     />
//                                                   </div>
//                                                 </FormControl>
//                                                 <FormMessage />
//                                               </FormItem>
//                                             )}
//                                           />
//                                           <FormField
//                                             control={form.control}
//                                             name={`variants_content.${variant}.content_value`}
//                                             disabled
//                                             render={({ field }) => (
//                                               <FormItem className="flex-1">
//                                                 <FormControl>
//                                                   <div
//                                                     className="relative"
//                                                     onClick={(e) => e.stopPropagation()}
//                                                   >
//                                                     <Input
//                                                       className={cn(
//                                                         'pl-10 text-slate-700 placeholder:text-slate-700 text-base font-normal'
//                                                       )}
//                                                       variant="default"
//                                                       placeholder="Input URL"
//                                                       value={field.value}
//                                                       onChange={field.onChange}
//                                                       startAdornment={
//                                                         <Wifi className="w-[18px] h-[18px] text-slate-400" />
//                                                       }
//                                                     />
//                                                   </div>
//                                                 </FormControl>
//                                                 <FormMessage />
//                                               </FormItem>
//                                             )}
//                                           />
//                                         </div>
//                                       )}
//                                   </div>
//                                   {variant === TouchPointVariants.NFC &&
//                                     watchVariantsContent?.[TouchPointVariants.NFC]?.enabled && (
//                                       <FormField
//                                         control={form.control}
//                                         name="asset_id"
//                                         disabled
//                                         render={({ field }) => (
//                                           <FormItem className="mt-2">
//                                             <FormControl>
//                                               <SingleCommandSelect
//                                                 variant="default"
//                                                 value={field.value ?? undefined}
//                                                 onChange={field.onChange}
//                                                 options={
//                                                   (Array.isArray(assets) &&
//                                                     assets?.map((asset) => ({
//                                                       value: asset.id,
//                                                       label: asset.name,
//                                                     }))) ||
//                                                   []
//                                                 }
//                                                 placeholder={t('common:form.fields.select', {
//                                                   field: 'NFC',
//                                                 })}
//                                                 commandPlaceholder={t(
//                                                   'common:filter.search_by_name'
//                                                 )}
//                                               />
//                                             </FormControl>
//                                             <FormMessage />
//                                           </FormItem>
//                                         )}
//                                       />
//                                     )}
//                                 </div>
//                               </LockableSection>
//                             )
//                           }
//                         )}
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               </div>
//             </div>
//           </div>
//           <div className="flex md:flex-row flex-col gap-6 mt-6 w-full justify-between">
//             <div className="flex gap-6 items-center flex-1 h-full">
//               <LoadingButton
//                 size={'default'}
//                 type="submit"
//                 className="gap-[6px] flex-1 max-w-fit md:w-fit w-full"
//                 isLoading={isUpdating}
//                 disabled={!form.formState.isDirty}
//               >
//                 {t('common:buttons.update', { field: t('common:text.change') })}
//               </LoadingButton>
//               <Button
//                 type="button"
//                 onClick={() => back()}
//                 variant="secondary"
//                 className={`gap-[6px] flex-1 md:max-w-fit md:w-fit w-full md:border-none border border-primary`}
//               >
//                 {t('common:text.cancel')}
//               </Button>
//             </div>
//             <CustomDialog
//               ref={deleteFormRef}
//               noFooter
//               button={
//                 <LoadingButton
//                   type="button"
//                   isLoading={isDeletingTouchPoint}
//                   variant="destructive"
//                   className="md:bg-transparent py-[8px] rounded-[8px] gap-[6px] md:text-red-500 flex-1 md:max-w-fit md:w-fit w-full"
//                 >
//                   <Trash className="h-4 w-4" />
//                   {t('common:buttons.delete', {
//                     field: type === 'qr_code' ? 'QR' : 'Link',
//                   })}
//                 </LoadingButton>
//               }
//               title={t('common:buttons.delete', {
//                 field: type === 'qr_code' ? 'QR' : 'Link',
//               })}
//               size="sm"
//             >
//               {({ close }) => (
//                 <div className="flex flex-col gap-6 w-full">
//                   <span className="text-slate-600 text-sm">
//                     {t('common:messages.delete_dialog', {
//                       field: type === 'qr_code' ? 'QR' : 'Link',
//                     })}
//                   </span>
//                   <div className="flex justify-end gap-6 w-full">
//                     <Button type="button" variant="secondary" onClick={close} className="gap-[6px]">
//                       {t('common:text.cancel')}
//                     </Button>
//                     <LoadingButton
//                       type="button"
//                       isLoading={isDeletingTouchPoint}
//                       variant="destructive"
//                       onClick={handleDelete}
//                       iconLeft={<Trash />}
//                     >
//                       {t('common:buttons.delete', {
//                         field: type === 'qr_code' ? 'QR' : 'Link',
//                       })}
//                     </LoadingButton>
//                   </div>
//                 </div>
//               )}
//             </CustomDialog>
//           </div>
//           <div className="flex flex-col gap-4 items-start md:h-0 h-[calc(20svh-60px)]"></div>
//         </form>
//       </Form>
//       <CustomDialog
//         size="sm"
//         title={t('common:buttons.edit', { field: t('common:label.short_link') })}
//         noButton
//         noFooter
//         ref={editLinkFormRef}
//       >
//         {({ close }) => (
//           <Suspense fallback={<SkeletonCard className="h-[300px] w-full" />}>
//             <TouchPointShortLinkForm
//               initialData={{
//                 // domain_id: defaultValues.domain_id,
//                 slug: defaultValues.slug,
//                 content_value: defaultValues.content_value,
//                 suggested_slugs: initialData?.suggested_slugs || [],
//               }}
//               onFinish={close}
//             />
//           </Suspense>
//         )}
//       </CustomDialog>
//     </>
//   )
// }
