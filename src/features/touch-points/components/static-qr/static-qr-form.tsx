'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { ChevronUpIcon, CopyIcon, DownloadIcon, FileText, Info, Link, Wifi } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { Separator } from '@/shared/components/ui/separator'
import {
  useCreateStaticQr,
  useUpdateStaticQr,
} from '@/features/touch-points/hooks/static-qr/mutations'
import { StaticQrItem } from './static-qr.types'
import { buildPayload, useStaticQrData } from '@/features/touch-points/hooks/use-static-qr-data'
import { ENABLED_STATIC_QR_TYPES } from '@/features/touch-points/constants/static-qr'
import {
  QrRenderWithRef,
  DownloadQrPopover,
  QrRenderRef,
} from '@/features/bootstrap/components/qr-render'
import { useQrContext } from '@/shared/providers/qr-customize-provider'
import { QrCustomizeFormElements } from '../simple-form/qr-customize-form-elements'
import { TextQrFields } from './fields/text-qr-fields'
import { UrlQrFields } from './fields/url-qr-fields'
import { WifiQrFields } from './fields/wifi-qr-fields'
import { motion, AnimatePresence } from 'framer-motion'
import { staticQrFormSchema } from '@/shared/schemas/static-qr'
import { cn } from '@/shared/lib/utils'

type FormValues = z.infer<typeof staticQrFormSchema>

type Props = {
  mode: 'create' | 'edit'
  item?: StaticQrItem | null
}

export const StaticQrForm = ({ mode, item }: Props) => {
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const { t } = useTranslation(['common', 'touchpoint'])
  const qrRef = useRef<QrRenderRef & { handleCopyQr: () => void }>(null)

  const { mutate: createStaticQr } = useCreateStaticQr(org_id)
  const { mutate: updateStaticQr } = useUpdateStaticQr(org_id, item?.id ?? '')

  const defaultValues: FormValues = useMemo(() => {
    if (!item) {
      return {
        name: '',
        type: 'text',
        text: '',
        url: '',
        wifi_ssid: '',
        wifi_password: '',
        wifi_security: 'WPA',
        wifi_hidden: false,
      }
    }
    return {
      name: item.name,
      type: item.payload.type,
      text: item.payload.type === 'text' ? (item.payload.text ?? '') : '',
      url: item.payload.type === 'url' ? (item.payload.url ?? '') : '',
      wifi_ssid: item.payload.type === 'wifi' ? (item.payload.wifi?.ssid ?? '') : '',
      wifi_password: item.payload.type === 'wifi' ? (item.payload.wifi?.password ?? '') : '',
      wifi_security: item.payload.type === 'wifi' ? (item.payload.wifi?.security ?? 'WPA') : 'WPA',
      wifi_hidden: item.payload.type === 'wifi' ? Boolean(item.payload.wifi?.hidden) : false,
    }
  }, [item])

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

  const { qrOptions, setQrOptions } = useQrContext()
  const [showCustomizeQR, setShowCustomizeQR] = useState(false)

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  useEffect(() => {
    if (item?.qr_customize_options) {
      setQrOptions(item.qr_customize_options as any)
    }
  }, [item, setQrOptions])

  const qrData = useStaticQrData(qrRelevantFields, t)

  const previewOptions = useMemo(() => {
    delete qrOptions?.qrOptions?.typeNumber
    return { ...qrOptions, data: qrData }
  }, [qrOptions, qrData])

  const onSubmit = (values: FormValues) => {
    const payload = buildPayload(values)
    if (mode === 'create') {
      createStaticQr(
        { name: values.name, payload, qr_customize_options: qrOptions },
        { onSuccess: () => router.push(`/org/${org_id}/touch-points/qr-code/static`) }
      )
    } else {
      if (!item) return
      updateStaticQr(
        { name: values.name, payload, qr_customize_options: qrOptions },
        { onSuccess: () => router.push(`/org/${org_id}/touch-points/qr-code/static`) }
      )
    }
  }

  const typeOptions = [
    {
      id: 'text' as const,
      label: t('touchpoint:static_qr.type.text', { defaultValue: 'Text' }),
      icon: FileText,
    },
    {
      id: 'url' as const,
      label: t('touchpoint:static_qr.type.url', { defaultValue: 'URL' }),
      icon: Link,
    },
    {
      id: 'wifi' as const,
      label: t('touchpoint:static_qr.type.wifi', { defaultValue: 'WiFi' }),
      icon: Wifi,
    },
  ]

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full max-w-7xl mx-auto flex flex-col gap-4"
      >
        {/* Quota banner */}
        {/* <div className="flex items-center gap-2">
          <Crown className="size-5 text-slate-400 shrink-0" />
          <p className="text-sm text-slate-500">
            {t('touchpoint:static_qr.quota_message', {
              defaultValue: "You've got 93 more QR codes / Smartlinks to use this month.",
            })}
          </p>
        </div> */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left panel ── */}
          <div className="flex flex-col gap-4 lg:col-span-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-6">
              {/* Info alert */}
              <div className="flex items-start gap-2 bg-blue-50 rounded-lg px-4 py-3">
                <Info className="size-4 text-secondary-blue shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-[1.6]">
                  {t('touchpoint:static_qr.info_message', {
                    defaultValue:
                      'Static QR codes contain fixed data. Once generated, the QR code image itself cannot be changed. If you need to update the content, you will need to generate a new QR code.',
                  })}
                </p>
              </div>

              {/* Type chips */}
              <div className="flex flex-wrap gap-4">
                {typeOptions
                  .filter(({ id }) => ENABLED_STATIC_QR_TYPES.includes(id))
                  .map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => form.setValue('type', id, { shouldValidate: true })}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-[6px] rounded-lg border text-xs font-medium transition-colors',
                        type === id
                          ? 'bg-blue-50 border-secondary-blue text-secondary-blue'
                          : 'bg-white border-slate-500 text-slate-600 hover:border-slate-400'
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-6',
                          type === id ? 'text-secondary-blue' : 'text-slate-500'
                        )}
                      />
                      {label}
                    </button>
                  ))}
              </div>

              {/* Name field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common:form.fields.name', { field: '' })}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type-specific fields */}
              {type === 'text' && <TextQrFields />}
              {type === 'url' && <UrlQrFields />}
              {type === 'wifi' && <WifiQrFields />}

              <Separator />

              {/* Customize QR – collapsible */}
              <Collapsible open={showCustomizeQR} onOpenChange={setShowCustomizeQR}>
                <CollapsibleTrigger className="flex justify-between w-full items-center group">
                  <span className="text-[15px] font-medium text-slate-700">
                    {t('common:buttons.customize_field', {
                      field: t('common:label.qr_code'),
                    })}
                  </span>
                  <ChevronUpIcon
                    className={cn(
                      'size-5 text-slate-500 transition-transform duration-300',
                      !showCustomizeQR && 'rotate-180'
                    )}
                  />
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
                          className="pt-4"
                        >
                          <QrCustomizeFormElements />
                        </motion.div>
                      </motion.div>
                    </CollapsibleContent>
                  )}
                </AnimatePresence>
              </Collapsible>
            </div>

            {/* Mobile QR preview */}
            <div className="lg:hidden flex flex-col items-center gap-4 bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-base font-semibold text-foreground text-center">
                {t('common:text.preview')}
              </p>
              <div className="bg-white rounded-[15px] shadow-[0px_2.667px_5.333px_0px_rgba(5,27,68,0.08)] p-4">
                <QrRenderWithRef qrOptions={previewOptions as any} size={200} border={false} />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button type="submit" size="default">
                {t('common:buttons.save', { field: '' })}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="default"
                onClick={() => router.push(`/org/${org_id}/touch-points/qr-code/static`)}
              >
                {t('common:buttons.cancel', { field: '' })}
              </Button>
            </div>
          </div>

          {/* ── Right panel (desktop only) ── */}
          <div className="hidden lg:flex flex-col items-center gap-6 lg:col-span-4">
            <p className="text-lg font-semibold text-foreground text-center">
              {t('common:text.preview')}
            </p>

            {/* QR in shadow card */}
            <div className="bg-white rounded-[15px] shadow-[0px_2.667px_5.333px_0px_rgba(5,27,68,0.08)] p-4">
              <QrRenderWithRef
                ref={qrRef}
                size={168}
                qrOptions={previewOptions as any}
                border={false}
              />
            </div>

            {/* Download + Copy buttons */}
            <div className="flex gap-2.5 w-full px-4 justify-center">
              <DownloadQrPopover
                qrOptions={previewOptions as any}
                popoverAlign="start"
                button={
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1 border-slate-200 text-slate-700"
                  >
                    <DownloadIcon className="size-5" />
                    {t('common:actions.download', { defaultValue: 'Download' })}
                  </Button>
                }
              />
              <Button
                type="button"
                size="icon"
                variant={'outline'}
                className="border-slate-200 size-10"
                onClick={() => qrRef.current?.handleCopyQr()}
              >
                <CopyIcon className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  )
}
