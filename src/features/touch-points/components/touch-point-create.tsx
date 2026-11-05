'use client'
import { touchPointFormCreateWithAdvanceSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'
import { useCreateTouchPoint } from '@/features/touch-points/hooks/mutations'
import { useParams, useRouter } from 'next/navigation'
import { OrgQuota } from '@/shared/types/plan-permission'
import { TouchPointCreateV2 } from './forms/create-new/touch-point-form-create-v2'
import QrCustomizeProvider from '@/shared/providers/qr-customize-provider'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { useState } from 'react'
import { TouchPoint } from '@/core/types/touch-point.type'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Input } from '@/shared/components/ui/input'
import { E2EETouchPointDialog } from './e2ee-touchpoint-dialog'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { ContentBlock } from '@/shared/components/customize/content-block'
import Link from 'next/link'
import imageError from '@/public/images/reach_limit_touchpoint_banner.png'
import { Button } from '@/shared/components/ui/button'
import { useTouchPointForm } from '../hooks'
import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
import { LoadingButton } from '@/shared/components/customize/loading-button'

export const TouchPointCreate = ({
  orgQuota,
  blocked,
}: {
  orgQuota?: OrgQuota
  blocked: boolean
}) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { mutate: createTouchPoint, isPending: isCreating } = useCreateTouchPoint(org_id, {
    noToast: true,
  })
  const router = useRouter()
  const { t } = useTranslation()

  const [e2eeTouchPoint, setE2eeTouchPoint] = useState<
    ReturnType<typeof useCreateTouchPoint>['data'] | null
  >(null)

  const handleSubmit = (values: z.infer<typeof touchPointFormCreateWithAdvanceSchema>) => {
    createTouchPoint(values, {
      onSuccess: (data) => {
        if (data.privacy_security?.e2e_encryption) {
          setE2eeTouchPoint(data)
        } else {
          toast.success(
            t('common:messages.success.created', {
              field: values.variants_content?.[AllTouchPointVariants.QR]?.enabled
                ? '$t(common:label.qr_code)'
                : '$t(common:label.short_link)',
            })
          )
          router.push(
            `/org/${org_id}/short-links/${data.id}?type=${
              values.variants_content?.[AllTouchPointVariants.QR]?.enabled
                ? 'qr_code'
                : 'short_link'
            }`
          )
        }
      },
    })
  }

  const { form, isFormDirty } = useTouchPointForm()
  const { back } = useFormWarningProvider()
  return (
    <ContentLayout
      title={t('common:buttons.create', { field: t('label.new') })}
      backPath={`/org/${org_id}/short-links`}
      className="p-0!"
      footer={
        !blocked && (
          <div className="w-full max-w-7xl mx-auto my-auto px-6 lg:px-12">
            <div className="flex gap-4 justify-end lg:pr-[324px]">
              <Button type="button" variant="tertiary" onClick={back}>
                {t('common:buttons.cancel')}
              </Button>
              <LoadingButton
                type="submit"
                form="touch-point-create-form"
                isLoading={isCreating}
              >
                {t('common:buttons.create')}
              </LoadingButton>
            </div>
          </div>
        )
      }
    >
      <ContentBlock
        title={t('common:messages.reach_limit', { field: 'Link' })}
        description={t('common:messages.reach_limit_description', { field: 'Link' })}
        blocked={blocked}
        callToAction={
          <div>
            {t('common:cta.upgrade_plan')}{' '}
            <Link href="https://li2.ai/vi/support" className="text-primary">
              {t('common:cta.contact_us')}
            </Link>
          </div>
        }
        blockBy="plan"
        showButtonPlan={false}
        imageError={imageError.src}
      >
        <>
          <QrCustomizeProvider>
            <TouchPointCreateV2
              form={form}
              isFormDirty={isFormDirty}
              onSubmit={handleSubmit}
              isLoading={isCreating}
              orgQuotaMonthlyTps={orgQuota?.monthly_touch_points || 0}
            />
          </QrCustomizeProvider>
          {e2eeTouchPoint && <E2EETouchPointDialog touchPoint={e2eeTouchPoint} />}
        </>
      </ContentBlock>
    </ContentLayout>
  )
}
