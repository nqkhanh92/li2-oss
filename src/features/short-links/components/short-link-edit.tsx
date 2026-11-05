'use client'

import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { ContentLayout } from '@/shared/components/layout/content-layout'
import { useSidebar } from '@/shared/components/ui/sidebar'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import QrCustomizeProvider from '@/shared/providers/qr-customize-provider'

import { useShowTouchPoint } from '@/features/touch-points/hooks/queries'
import { useUpdateTouchPoint } from '@/features/touch-points/hooks/mutations'
import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
import { useMediaQuery } from '@/shared/hooks/use-media-query'
import { pickDefinedAndNotNull } from '@/shared/utils'
import { useTouchPointActions } from '@/features/touch-points/hooks/use-touchpoint-actions'

import { ShortLinkForm } from './short-link-form'
import { shortLinkEditFormSchema, type ShortLinkFormValues } from '../schemas/short-link-form.schema'
import { ShortLinkDetailHeader } from './short-link-detail-header'
import { prepareSubmitValues } from '../utils/prepare-submit-values'
import { getQrDefaultOptions } from '@/features/touch-points/constants'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { Options } from 'qr-code-styling'
const FORM_ID = 'shortLinkEditForm'

export const ShortLinkEdit = () => {
  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id: string }>()
  const { t } = useTranslation(['common'])
  const { back } = useFormWarningProvider()

  // useSuspenseQuery — data is always defined by the time this renders
  const { data: touchPoint } = useShowTouchPoint(org_id, touch_point_id)
  const { handleBack, handleCopy } = useTouchPointActions(touchPoint)

  const defaultValues = useMemo<ShortLinkFormValues>(
    () => ({
      ...pickDefinedAndNotNull(touchPoint),
      tags: touchPoint.tp_tag_links?.map((link) => link.tag_id) ?? [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // compute once on mount — suspense guarantees data is ready
  )

  const form = useForm<ShortLinkFormValues>({
    resolver: zodResolver(shortLinkEditFormSchema) as Resolver<ShortLinkFormValues>,
    defaultValues,
  })

  const { setEnabled } = useFormWarningProvider()
  const isDirty = Object.keys(form.formState.dirtyFields).length > 0

  useEffect(() => {
    setEnabled(isDirty && !form.formState.isSubmitSuccessful)
  }, [isDirty, form.formState.isSubmitSuccessful, setEnabled])

  const [activeTab, setActiveTab] = useState('basic_editing')
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
  // Only apply on lg screens — 2xl has enough space to keep the sidebar open.
  // The second condition catches 1920px monitors at 125% Windows display scaling,
  // which report 1536px CSS width (1920 / 1.25) and would otherwise escape the first check.
  const isLgOnly = useMediaQuery(
    '(min-width: 1024px) and (max-width: 1535px), ' +
      '(min-resolution: 1.25dppx) and (min-width: 1536px) and (max-width: 1919px)'
  )
  // true if we programmatically collapsed the sidebar (user had it open before)
  const collapsedBySelf = useRef(false)

  useEffect(() => {
    if (!isLgOnly) return
    if (activeTab === 'analytics') {
      if (sidebarOpen) {
        collapsedBySelf.current = true
        setSidebarOpen(false)
      }
    } else if (collapsedBySelf.current) {
      collapsedBySelf.current = false
      setSidebarOpen(true)
    }
  }, [activeTab, isLgOnly])

  // Restore on page leave
  useEffect(() => {
    return () => {
      if (collapsedBySelf.current) {
        setSidebarOpen(true)
      }
    }
  }, [])

  const { mutate: updateTouchPoint, isPending: isUpdating } = useUpdateTouchPoint(
    org_id,
    touch_point_id
  )

  const handleSubmit = (values: ShortLinkFormValues) => {
    updateTouchPoint(
      { data: prepareSubmitValues(values) },
      {
        onSuccess: ({ data: _data }) => {
          form.reset({ ...values, meta_tags: _data?.data?.meta_tags })
        },
      }
    )
  }

  // Also gates the lead and sale counts in the detail header
  const conversionTrackingEnabled =
    !disabledFeatures.ATTRIBUTION && (touchPoint as any)?.conversion_tracking?.enabled === true

  const qrOptions = useMemo(() => {
    const defaultQrOptions = getQrDefaultOptions(`${touchPoint.short_url}?t=1`)
    return {
      ...defaultQrOptions,
      ...(touchPoint.qr_customize_options as Options),
    }
  }, [touchPoint])

  return (
    <ContentLayout
      title={
        <ShortLinkDetailHeader
          shortUrl={touchPoint.short_url}
          handleBack={handleBack}
          handleCopy={() => handleCopy()}
          visits={touchPoint.visits?.[0]?.count ?? 0}
          conversionSummary={touchPoint.conversion_summary}
          conversionTrackingEnabled={conversionTrackingEnabled}
        />
      }
      compact={activeTab !== 'analytics'}
      isBackable={false}
      navBarClassName="py-2 h-[60px] w-full [&_#content-layout-title]:w-full"
      footer={
        isDirty && activeTab !== 'analytics' ? (
          <div className="w-full max-w-7xl mx-auto my-auto px-6 lg:px-12">
            <div className="flex gap-4 justify-center">
              <Button type="button" variant="tertiary" onClick={back}>
                {t('common:buttons.cancel')}
              </Button>
              <LoadingButton type="submit" isLoading={isUpdating} form={FORM_ID}>
                {t('common:buttons.save_changes')}
              </LoadingButton>
            </div>
          </div>
        ) : undefined
      }
    >
      <QrCustomizeProvider initialValues={qrOptions}>
        <ShortLinkForm
          form={form}
          onSubmit={handleSubmit}
          isLoading={isUpdating}
          touchPointId={touch_point_id}
          onTabChange={setActiveTab}
          formId={FORM_ID}
        />
      </QrCustomizeProvider>
    </ContentLayout>
  )
}
