import { useParams, useRouter } from 'next/navigation'
import { useCreateTouchPoint } from '../../hooks/mutations'
import {
  MAX_TOUCHPOINTS_NAME_LENGTH,
  metaTagsSchema,
  simpleTouchPointSchema,
  touchPointFormSchema,
} from '@/shared/schemas/touch-points'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AllTouchPointVariants, TouchPointContentType } from '@/features/touch-points/types'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/components/ui/input'
import { ArrowRightIcon, ChevronRightIcon, Link2Icon, ScanQrCode } from 'lucide-react'
import Image from 'next/image'
import { LinkCard } from './link-card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { QRCard } from './qr-card'
import { motion, AnimatePresence } from 'framer-motion'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { QrCustomizeFormElements } from './qr-customize-form-elements'
import { TouchPoint } from '@/core/types/touch-point.type'
import { PulserLoadingButton } from '@/shared/components/customize/pulser-loading-button'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'
import { QrRenderRef, QrRenderWithRef } from '@/features/bootstrap/components/qr-render'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { GeneratedDrawer } from './generated-drawer'
import { AnimatedTab, AnimatedTabs } from '@/shared/components/animation/animated-tabs'
import { cn } from '@/shared/lib/utils'
import { toast } from 'sonner'
import { ConfettiCanvas } from '@/shared/components/ui/confetti-canvas'
import { usePlanFeatures } from '../../hooks'
import { fetchMetaTags } from '@/app/actions/utilities'
import {
  StaticQrTabProvider,
  StaticQrTabFormContent,
  StaticQrTabPreviewContent,
} from './static-qr-tab-content'
import { QrCodeIcon } from 'lucide-react'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { GridPatternBg } from '@/shared/components/ui/grid-pattern-bg'

export const TouchPointSimpleForm = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const orgSlug = useOrganizationStore((s) => s.organization?.org_slug)
  const { mutate: createTouchPoint, isPending: isCreating } = useCreateTouchPoint(org_id, {
    shouldRevalidatePath: false,
    noToast: true,
  })
  const { reset, isDirty: isQrDirty } = useQrContext()
  const defaultValues: z.infer<typeof simpleTouchPointSchema> = useMemo(() => {
    return {
      name: '',
      enabled: true,
      content_type: TouchPointContentType.URL,
      is_campaign_based: false,
      content_value: '',
      tags: [],
      variants_content: {
        QR: {
          enabled: false,
          content_value: '',
        },
        NFC: {
          enabled: false,
          content_value: '',
        },
        WIFI: {
          enabled: false,
          content_value: '',
        },
      },
      qr_customize_options: {},
      qr_logo_image: QR_CUSTOMIZE_DEFAULT_OPTIONS.image,
    }
  }, [])
  const form = useForm<z.infer<typeof touchPointFormSchema>>({
    resolver: zodResolver(touchPointFormSchema),
    // context: { schema: touchPointFormSchema },
    defaultValues,
  })
  const [createdTouchPoint, setCreatedTouchPoint] = useState<Pick<
    TouchPoint,
    'id' | 'short_url' | 'qr_customize_options'
  > | null>(null)
  const { push } = useRouter()

  const { enableMetaTags } = usePlanFeatures()

  const { qrOptions } = useQrContext()
  const [tab, setTab] = useState<AllTouchPointVariants | 'STATIC_QR'>(AllTouchPointVariants.LINK)
  const [isFetchingMetaTags, startFetchingMetaTags] = useTransition()

  const handleSubmit = async (values: z.infer<typeof touchPointFormSchema>) => {
    startFetchingMetaTags(async () => {
      if (enableMetaTags) {
        const result = await fetchMetaTags(values.content_value)
        if (result) {
          const parsed = metaTagsSchema.safeParse(result)
          if (parsed.success) {
            values.meta_tags = {
              enabled: true,
              title: parsed.data.title,
              description: parsed.data.description,
              image: parsed.data.image,
              isAutoFetched: true,
            }
            if (parsed.data.title)
              values.name = parsed.data.title.slice(0, MAX_TOUCHPOINTS_NAME_LENGTH)
          }
        }
      }
      const formValues = {
        ...values,
        qr_logo_image: undefined,
        //If QR is selected, then qr_customize_options and variants_content will be updated
        ...(tab === AllTouchPointVariants.QR && {
          qr_logo_image: values.qr_logo_image,
          qr_customize_options: qrOptions,
          variants_content: {
            ...values.variants_content,
            [AllTouchPointVariants.QR]: { enabled: true, content_value: values.content_value },
          },
        }),
      }
      createTouchPoint(formValues, {
        onSuccess: (data) => {
          form.reset(defaultValues)
          reset()
          setOpen(true)
          setCreatedTouchPoint(data)
          toast.success(
            t('common:messages.success.created', {
              field:
                tab === AllTouchPointVariants.LINK
                  ? '$t(common:label.short_link)'
                  : '$t(common:label.qr_code)',
            })
          )
        },
      })
    })
  }
  const formDirty = Object.keys(form.formState.dirtyFields).length > 0

  const { t } = useTranslation(['dashboard', 'common', 'touchpoint'])
  const [showCustomizeQR, setShowCustomizeQR] = useState(false)
  const qrRef = useRef<QrRenderRef>(null)

  const [open, setOpen] = useState(false)

  const isMobile = useIsMobile()
  useEffect(() => {
    const isDirty = formDirty || isQrDirty
    if (createdTouchPoint && isDirty) {
      setCreatedTouchPoint(null)
    }
  }, [createdTouchPoint, formDirty, isQrDirty])

  useEffect(() => {
    setShowCustomizeQR(false)
    if (createdTouchPoint) {
      form.reset()
      reset()
      setCreatedTouchPoint(null)
    }
  }, [tab])
  const animatedTabs = [
    {
      id: AllTouchPointVariants.LINK,
      label: (
        <div className="flex gap-1 items-center">
          <div className="w-7 h-7 rounded-[6px] flex items-center justify-center group-data-[state=inactive]:opacity-50 bg-secondary-blue">
            <Link2Icon className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg line-clamp-[24px] text-nowrap hidden md:block">
            {t('touchpoint:touch_point_type.link')}
          </span>
          <span className="font-semibold text-lg line-clamp-[24px] text-nowrap md:hidden">
            {t('touchpoint:touch_point_type.shortLink')}
          </span>
        </div>
      ),
    },
    {
      id: AllTouchPointVariants.QR,
      label: (
        <div className="flex gap-1 items-center">
          <div className="w-7 h-7 rounded-[6px] flex items-center justify-center group-data-[state=inactive]:opacity-50 bg-secondary-purple">
            <ScanQrCode className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg line-clamp-[24px] text-nowrap hidden md:block">
            {t('touchpoint:touch_point_type.qr')}
          </span>
          <span className="font-semibold text-lg line-clamp-[24px] text-nowrap md:hidden">
            {t('touchpoint:touch_point_type.shortQr')}
          </span>
        </div>
      ),
    },
    {
      id: 'STATIC_QR' as any,
      label: (
        <div className="flex gap-1 items-center">
          <div className="w-7 h-7 rounded-[6px] flex items-center justify-center group-data-[state=inactive]:opacity-50 bg-secondary-orange">
            <QrCodeIcon className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg line-clamp-[24px] text-nowrap hidden md:block">
            {t('touchpoint:static_qr.label')}
          </span>
          <span className="font-semibold text-lg line-clamp-[24px] text-nowrap md:hidden">
            {t('touchpoint:static_qr.shortLabel')}
          </span>
        </div>
      ),
    },
  ] satisfies AnimatedTab[]

  return (
    <>
      {isMobile && createdTouchPoint && tab !== 'STATIC_QR' && (
        <GeneratedDrawer
          open={open}
          setOpen={setOpen}
          generatedLink={createdTouchPoint.short_url}
          type={tab as AllTouchPointVariants}
          qrOptions={createdTouchPoint.qr_customize_options as any}
          touchPointId={createdTouchPoint.id}
          onViewDetail={() => {
            push(`/org/${orgSlug || org_id}/short-links/${createdTouchPoint.id}`)
          }}
        />
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <StaticQrTabProvider>
            <div className="w-full h-full flex">
              <div className="bg-linear-to-r from-[#B9AAFF] to-[#D6A4AF] pr-px w-full max-w-[800px]">
                <div className="py-4 lg:py-6 bg-card h-full">
                  <AnimatedTabs
                    className="[&_button]:py-2 border-b-[1px] w-full border-slate-300 px-6 lg:px-9"
                    tabs={animatedTabs}
                    value={tab}
                    onValueChange={(value) => setTab(value as AllTouchPointVariants | 'STATIC_QR')}
                  />
                  <div className="flex flex-col lg:flex-row gap-9 px-6 lg:px-9">
                    {tab === 'STATIC_QR' ? (
                      <StaticQrTabFormContent />
                    ) : (
                      <>
                        <div className="flex flex-col gap-6 my-6 w-full">
                          <FormField
                            name="content_value"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-slate-700! text-base! font-semibold">
                                  {t('dashboard:simpleForm.linkInput.label')}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className="h-14 px-6 py-4"
                                    placeholder={t('dashboard:simpleForm.linkInput.placeholder')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        e.currentTarget.blur()
                                      }
                                    }}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <AnimatePresence initial={false}>
                            {tab === AllTouchPointVariants.QR && (
                              <motion.div
                                initial={{
                                  height: 0,
                                  opacity: 0,
                                  marginBottom: 0,
                                  overflow: 'hidden',
                                }}
                                animate={{
                                  height: 'auto',
                                  opacity: 1,
                                  marginBottom: 0,
                                  overflow: 'hidden',
                                }}
                                exit={{
                                  height: 0,
                                  opacity: 0,
                                  marginBottom: -24,
                                  overflow: 'hidden',
                                }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                layout
                              >
                                <Collapsible
                                  open={showCustomizeQR}
                                  onOpenChange={setShowCustomizeQR}
                                >
                                  <CollapsibleTrigger className="flex justify-between w-full items-center group border-b border-slate-300 pb-2 mb-2">
                                    <span className="text-base font-medium text-slate-700">
                                      {t('common:buttons.customize_field', {
                                        field: `${t('common:label.qr_code')}`,
                                      })}
                                    </span>
                                    <ChevronRightIcon className="w-[22px]! h-[22px]! transition-transform duration-300 group-data-[state=open]:rotate-90" />
                                  </CollapsibleTrigger>
                                  <AnimatePresence>
                                    {showCustomizeQR && (
                                      <CollapsibleContent asChild forceMount>
                                        <motion.div
                                          initial={{ height: 0, overflow: 'hidden' }}
                                          animate={{ height: 'auto', overflow: 'hidden' }}
                                          exit={{ height: 0, overflow: 'hidden' }}
                                          transition={{ duration: 0.3, ease: 'easeOut' }}
                                        >
                                          <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeOut' }}
                                          >
                                            <div className="block lg:hidden py-4">
                                              <span className="text-lg text-center font-semibold line-clamp-2">
                                                {t('common:text.preview')}
                                              </span>
                                              <QrRenderWithRef
                                                qrOptions={qrOptions}
                                                size={140}
                                                border={false}
                                                ref={qrRef}
                                              />
                                            </div>
                                            <QrCustomizeFormElements />
                                          </motion.div>
                                        </motion.div>
                                      </CollapsibleContent>
                                    )}
                                  </AnimatePresence>
                                </Collapsible>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div>
                            <PulserLoadingButton
                              isLoading={isCreating || isFetchingMetaTags}
                              size="lg"
                              iconRight={<ArrowRightIcon />}
                              containerClassName="text-l font-medium!"
                            >
                              {tab === AllTouchPointVariants.LINK
                                ? t('dashboard:simpleForm.linkSubmit.label')
                                : t('dashboard:simpleForm.qrSubmit.label')}
                            </PulserLoadingButton>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <GridPatternBg className="flex-1">
                <div
                  onClick={() => {
                    if (tab !== 'STATIC_QR' && !showCustomizeQR && !createdTouchPoint) {
                      setShowCustomizeQR(true)
                    }
                  }}
                  className={cn(
                    'py-4 px-4 lg:px-9 lg:py-9 relative lg:block mx-auto hidden flex-1 h-full w-full',
                    !showCustomizeQR && 'cursor-pointer'
                  )}
                >
                  {tab === AllTouchPointVariants.QR && (
                    <>
                      {createdTouchPoint ? (
                        <>
                          <ConfettiCanvas key={createdTouchPoint.id} />
                          <QRCard
                            size={151}
                            qrOptions={createdTouchPoint?.qr_customize_options as any}
                            link={createdTouchPoint.short_url}
                            onViewDetail={() => {
                              push(`/org/${orgSlug || org_id}/short-links/${createdTouchPoint.id}`)
                            }}
                          />
                        </>
                      ) : (
                        <motion.div
                          className="relative my-6 flex flex-col gap-2"
                          initial={{ opacity: 1 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                          <label className="text-sm font-medium text-slate-700 text-center">
                            {t('common:text.preview')}
                          </label>
                          <QrRenderWithRef
                            size={180}
                            className="size-[200px] bg-card rounded-md shadow-[0_3px_5px_rgba(5,27,68,0.08)] mx-auto flex justify-center items-center"
                            qrOptions={qrOptions}
                            ref={qrRef}
                            border={false}
                          />
                        </motion.div>
                      )}
                    </>
                  )}
                  {tab === AllTouchPointVariants.LINK && (
                    <>
                      {createdTouchPoint && createdTouchPoint.short_url ? (
                        <>
                          <ConfettiCanvas key={createdTouchPoint.id} />
                          <LinkCard
                            link={createdTouchPoint.short_url}
                            onViewDetail={() => {
                              push(`/org/${orgSlug || org_id}/short-links/${createdTouchPoint.id}`)
                            }}
                          />
                        </>
                      ) : (
                        <div className="relative max-w-[300px] h-full mx-auto">
                          <Image
                            src="/images/home_page/short-link.svg"
                            alt="qr-code"
                            fill
                            priority
                          />
                        </div>
                      )}
                    </>
                  )}
                  {tab === 'STATIC_QR' && <StaticQrTabPreviewContent />}
                </div>
              </GridPatternBg>
            </div>
          </StaticQrTabProvider>
        </form>
      </Form>
    </>
  )
}
