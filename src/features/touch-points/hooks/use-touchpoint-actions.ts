'use client'

import { writeQrToClipboard } from '@/shared/helpers/client-helper'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { parse } from 'tldts'
import { touchPointUpdateSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'
import { useShowTouchPoint } from './queries'
import { getQrDefaultOptions } from '../constants'
import { Options } from 'qr-code-styling'

export const useTouchPointActions = (touchPoint: ReturnType<typeof useShowTouchPoint>['data']) => {
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const { t } = useTranslation(['common', 'touchpoint'])
  const handleBack = () => {
    try {
      const referrer = document.referrer
      const currentDomain = parse(window.location.href).hostname
      const referrerDomain = parse(referrer).hostname
      if (referrerDomain === currentDomain) {
        router.back()
      } else {
        router.replace(`/org/${org_id}/short-links`)
      }
    } catch (error) {
      router.back()
    }
  }

  const handleCopy = async (type?: AllTouchPointVariants, options?: any) => {
    try {
      if (type === AllTouchPointVariants.QR) {
        let qrOptions: Options = touchPoint.qr_customize_options ?? options
        if (Object.keys(qrOptions).length === 0) {
          const qrUrl = `${touchPoint.short_url}?t=1`
          qrOptions = {
            ...getQrDefaultOptions(qrUrl),
            data: qrUrl,
          }
        }

        await writeQrToClipboard(qrOptions)
        toast.success(t('common:toast.title_copy'), {
          id: 'qr-copy',
          description: t('common:toast.description_copy', {
            field: '$t(label.qr_code)',
          }),
        })
      } else {
        navigator.clipboard.writeText(touchPoint?.short_url || '')
        toast.success(t('common:toast.title_copy'), {
          id: 'short-link-copy',
          description: t('common:toast.description_copy', {
            field: '$t(label.short_link)',
          }),
        })
      }
    } catch (error) {
      console.log(error)
      toast.error(t('common:messages.error.some_error'), {
        id: 'short-link-copy',
      })
    }
  }

  return { handleBack, handleCopy }
}
