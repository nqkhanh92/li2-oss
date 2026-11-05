'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { AlignLeftIcon, ChevronDownIcon, InfoIcon, Link2Icon, WifiIcon } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer'
import { CapaIcon } from '@/shared/components/icons/capa-icon'
import { QrRenderRef } from '@/features/bootstrap/components/qr-render'
import { cn } from '@/shared/lib/utils'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { QrCustomizeFormElements } from './qr-customize-form-elements'
import { TextQrFields } from '../static-qr/fields/text-qr-fields'
import { UrlQrFields } from '../static-qr/fields/url-qr-fields'
import { WifiQrFields } from '../static-qr/fields/wifi-qr-fields'
import { motion, AnimatePresence } from 'framer-motion'
import { staticQrFormSchema } from '@/shared/schemas/static-qr'
import { QrRenderWithRef } from '@/features/bootstrap/components/qr-render'
import { PulserLoadingButton } from '@/shared/components/customize/pulser-loading-button'
import { ArrowRightIcon } from 'lucide-react'

import { useCreateStaticQr } from '@/features/touch-points/hooks/static-qr/mutations'
import { useParams } from 'next/navigation'
import { buildPayload, useStaticQrData } from '@/features/touch-points/hooks/use-static-qr-data'
import { ENABLED_STATIC_QR_TYPES } from '@/features/touch-points/constants/static-qr'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { QRCard } from './qr-card'
import { ConfettiCanvas } from '@/shared/components/ui/confetti-canvas'

type FormValues = z.infer<typeof staticQrFormSchema>

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type StaticQrTabContextValue = {
  form: UseFormReturn<FormValues>
  type: FormValues['type']
  createdQr: ReturnType<typeof useCreateStaticQr>['data'] | null
  openDrawer: boolean
  setOpenDrawer: Dispatch<SetStateAction<boolean>>
  showCustomizeQR: boolean
  setShowCustomizeQR: Dispatch<SetStateAction<boolean>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previewOptions: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdPreviewOptions: any
  onSubmit: (values: FormValues) => void
  isCreating: boolean
  qrRef: RefObject<QrRenderRef>
}

const StaticQrTabContext = createContext<StaticQrTabContextValue | null>(null)

const useStaticQrTab = () => {
  const ctx = useContext(StaticQrTabContext)
  if (!ctx) throw new Error('useStaticQrTab must be used within StaticQrTabProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// Provider — owns all logic
// ---------------------------------------------------------------------------

export const StaticQrTabProvider = ({ children }: { children: ReactNode }) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation(['common', 'touchpoint', 'dashboard'])
  const { mutate: createStaticQr, isPending: isCreating } = useCreateStaticQr(org_id)
  const [createdQr, setCreatedQr] = useState<ReturnType<typeof useCreateStaticQr>['data'] | null>(
    null
  )
  const [openDrawer, setOpenDrawer] = useState(false)
  const [showCustomizeQR, setShowCustomizeQR] = useState(false)
  const qrRef = useRef<QrRenderRef>(null) as RefObject<QrRenderRef>

  const defaultValues: FormValues = {
    name: '',
    type: 'text',
    text: '',
    url: '',
    wifi_ssid: '',
    wifi_password: '',
    wifi_security: 'WPA',
    wifi_hidden: false,
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(staticQrFormSchema),
    defaultValues,
  })

  const type = form.watch('type')
  const qrRelevantFields = form.watch([
    'type',
    'text',
    'url',
    'wifi_ssid',
    'wifi_password',
    'wifi_security',
    'wifi_hidden',
  ])

  const { qrOptions, isDirty, reset } = useQrContext()

  const qrData = useStaticQrData(qrRelevantFields, t)
  const createdQrData = useStaticQrData(
    [
      createdQr?.payload.type,
      createdQr?.payload.text,
      createdQr?.payload.url,
      createdQr?.payload?.wifi?.ssid,
      createdQr?.payload?.wifi?.password,
      createdQr?.payload?.wifi?.security,
      createdQr?.payload?.wifi?.hidden,
    ],
    t
  )

  const previewOptions = useMemo(() => ({ ...qrOptions, data: qrData }), [qrOptions, qrData])
  const createdPreviewOptions = useMemo(() => {
    if (!createdQr) return {}
    return { ...createdQr.qr_customize_options, data: createdQrData }
  }, [createdQr, createdQrData])

  const onSubmit = (values: FormValues) => {
    const payload = buildPayload(values)
    createStaticQr(
      { name: values.name, payload, qr_customize_options: qrOptions },
      {
        onSuccess: (data) => {
          form.reset(defaultValues)
          reset()
          setOpenDrawer(true)
          setCreatedQr(data)
        },
      }
    )
  }

  const formDirty = Object.keys(form.formState.dirtyFields).length > 0
  useEffect(() => {
    if (createdQr && (formDirty || isDirty)) setCreatedQr(null)
  }, [createdQr, formDirty, isDirty])

  return (
    <StaticQrTabContext.Provider
      value={{
        form,
        type,
        createdQr,
        openDrawer,
        setOpenDrawer,
        showCustomizeQR,
        setShowCustomizeQR,
        previewOptions,
        createdPreviewOptions,
        onSubmit,
        isCreating,
        qrRef,
      }}
    >
      {children}
    </StaticQrTabContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Left side — form fields
// ---------------------------------------------------------------------------

export const StaticQrTabFormContent = () => {
  const {
    form,
    type,
    showCustomizeQR,
    setShowCustomizeQR,
    previewOptions,
    createdPreviewOptions,
    onSubmit,
    isCreating,
    qrRef,
    createdQr,
    openDrawer,
    setOpenDrawer,
  } = useStaticQrTab()
  const { t } = useTranslation(['common', 'touchpoint', 'dashboard'])
  const isMobile = useIsMobile()

  const QR_TYPE_OPTIONS = [
    {
      value: 'text' as const,
      label: t('touchpoint:static_qr.type.text', { defaultValue: 'Text' }),
      icon: AlignLeftIcon,
    },
    {
      value: 'url' as const,
      label: t('touchpoint:static_qr.type.url', { defaultValue: 'URL' }),
      icon: Link2Icon,
    },
    {
      value: 'wifi' as const,
      label: t('touchpoint:static_qr.type.wifi', { defaultValue: 'Wifi' }),
      icon: WifiIcon,
    },
  ].filter(({ value }) => ENABLED_STATIC_QR_TYPES.includes(value))

  return (
    <Form {...form}>
      <div className="flex flex-col gap-4 w-full py-6">
        {/* Info alert */}
        <div className="bg-blue-50 flex gap-2 items-start px-4 py-3 rounded-[8px]">
          <InfoIcon className="size-4 text-[#437ef7] shrink-0 mt-px" />
          <p className="text-[10px] leading-4 text-slate-600 tracking-[-0.01px]">
            {t('touchpoint:static_qr.info_message', {
              defaultValue:
                'Static QR codes contain fixed data. Once generated, the QR code image itself cannot be changed. If you need to update the content, you will need to generate a new QR code.',
            })}
          </p>
        </div>

        {/* QR type chips */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex gap-4 items-center flex-wrap">
                  {QR_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                    const active = field.value === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={cn(
                          'flex gap-1.5 items-center px-4 py-1.5 rounded-[8px] border transition-colors cursor-pointer',
                          active
                            ? 'bg-blue-50 border-[#437ef7]'
                            : 'bg-white border-slate-500 hover:border-slate-400'
                        )}
                      >
                        <Icon
                          className={cn('size-6', active ? 'text-[#437ef7]' : 'text-slate-600')}
                        />
                        <span
                          className={cn(
                            'text-xs font-medium leading-4',
                            active ? 'text-[#437ef7]' : 'text-slate-600'
                          )}
                        >
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {type === 'text' && <TextQrFields />}
        {type === 'url' && <UrlQrFields />}
        {type === 'wifi' && <WifiQrFields />}

        {/* Customize QR collapsible */}
        <Collapsible open={showCustomizeQR} onOpenChange={setShowCustomizeQR}>
          <CollapsibleTrigger className="flex justify-between w-full items-center group border-b border-slate-300 pb-2 mb-2">
            <span className="text-[15px] font-medium text-slate-700">
              {t('common:buttons.customize_field', {
                field: `${t('common:label.qr_code')}`,
              })}
            </span>
            <ChevronDownIcon className="size-6 transition-transform duration-300 group-data-[state=open]:rotate-180" />
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
                        qrOptions={previewOptions as any}
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

        <div>
          <PulserLoadingButton
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            isLoading={isCreating}
            size="lg"
            iconRight={<ArrowRightIcon />}
          >
            {t('dashboard:simpleForm.qrSubmit.label')}
          </PulserLoadingButton>
        </div>
      </div>

      {isMobile && (
        <Drawer open={openDrawer} onOpenChange={setOpenDrawer}>
          <DrawerContent>
            {createdQr && <ConfettiCanvas key={createdQr.id} />}
            <DrawerHeader>
              <DrawerTitle>
                <div className="flex justify-center items-center gap-2 border-b border-slate-300 pb-2">
                  <CapaIcon />
                  <span className="text-lg font-semibold text-foreground">
                    {t('common:messages.success.created_successfully')}
                  </span>
                </div>
              </DrawerTitle>
              <DrawerDescription asChild>
                <div className="mt-4 mb-6">
                  {createdQr && <QRCard size={151} qrOptions={createdPreviewOptions} />}
                </div>
              </DrawerDescription>
            </DrawerHeader>
          </DrawerContent>
        </Drawer>
      )}
    </Form>
  )
}

// ---------------------------------------------------------------------------
// Right side — QR preview / generated card
// ---------------------------------------------------------------------------

export const StaticQrTabPreviewContent = () => {
  const { createdQr, previewOptions, createdPreviewOptions } = useStaticQrTab()
  const { t } = useTranslation(['common'])

  if (createdQr) {
    return <QRCard size={151} qrOptions={createdPreviewOptions} />
  }

  return (
    <div className="relative my-6 flex flex-col gap-2">
      <label className="text-lg font-semibold text-foreground text-center">
        {t('common:text.preview')}
      </label>
      <div className="mx-auto flex justify-center items-center">
        <QrRenderWithRef
          size={180}
          className="bg-card size-[200px] rounded-md shadow-[0_3px_5px_rgba(5,27,68,0.08)] mx-auto flex justify-center items-center"
          qrOptions={previewOptions as any}
          border={false}
        />
      </div>
    </div>
  )
}
