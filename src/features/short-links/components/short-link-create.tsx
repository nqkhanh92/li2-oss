'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import Link from 'next/link'
import imageError from '@/public/images/reach_limit_touchpoint_banner.png'

import { ContentLayout } from '@/shared/components/layout/content-layout'
import { ContentBlock } from '@/shared/components/customize/content-block'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import QrCustomizeProvider from '@/shared/providers/qr-customize-provider'

import { useCreateTouchPoint } from '@/features/touch-points/hooks/mutations'
import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
import { E2EETouchPointDialog } from '@/features/touch-points/components/e2ee-touchpoint-dialog'

import { useShortLinkForm } from '../hooks/use-short-link-form'
import { ShortLinkForm } from './short-link-form'
import { prepareSubmitValues } from '../utils/prepare-submit-values'
import { ShortLinkCreatedDialog } from './short-link-created-dialog'
import { CREATE_TITLE_NAV_CLASS, CreateTitleBar } from './unified-create/create-title-bar'

import type { OrgQuota } from '@/shared/types/plan-permission'
import type { ShortLinkFormValues } from '../schemas/short-link-form.schema'
import type { Options } from 'qr-code-styling'

interface ShortLinkCreateProps {
  orgQuota?: OrgQuota
  blocked: boolean
  /**
   * Thay cho tiêu đề trang khi dùng trong trình tạo chung.
   *
   * Tiêu đề mặc định ("Tạo link rút gọn") là một lời khai về loại, và ở trình tạo chung thì loại
   * là thứ người dùng vừa chọn bằng công tắc — nên công tắc ĐỨNG ĐÚNG chỗ tiêu đề, không nằm
   * thêm một dòng phía trên. Bỏ trống thì giữ nguyên tiêu đề cũ, nên hai route cũ không đổi gì.
   */
  titleSlot?: React.ReactNode
}
const FORM_ID = 'shortLinkCreateForm'

type CreatedLinkInfo = {
  id: string
  shortUrl: string
  qrOptions?: Options | null
}

export const ShortLinkCreate = ({ orgQuota, blocked, titleSlot }: ShortLinkCreateProps) => {
  const { org_id } = useParams<{ org_id: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const { back } = useFormWarningProvider()

  const { form } = useShortLinkForm()
  const { mutate: createTouchPoint, isPending: isCreating } = useCreateTouchPoint(org_id, {
    noToast: true,
  })

  const [e2eeTouchPoint, setE2eeTouchPoint] = useState<
    ReturnType<typeof useCreateTouchPoint>['data'] | null
  >(null)
  const [createdLink, setCreatedLink] = useState<CreatedLinkInfo | null>(null)

  const navigateToDetail = (id: string) => {
    router.push(`/org/${org_id}/short-links/${id}?type=short_link`)
  }

  const handleSubmit = (values: ShortLinkFormValues) => {
    createTouchPoint(prepareSubmitValues(values), {
      onSuccess: (data) => {
        if (data.privacy_security?.e2e_encryption) {
          setE2eeTouchPoint(data)
        } else {
          setCreatedLink({
            id: data.id,
            shortUrl: data.short_url ?? '',
            qrOptions: (data.qr_customize_options as Options) ?? null,
          })
        }
      },
    })
  }

  /**
   * Công tắc loại căn giữa — cùng một chỗ với nhánh Artifact, nếu không thì bấm qua lại hai tab sẽ
   * thấy nó nhảy ngang. Không truyền `titleSlot` (hai route cũ) thì giữ nguyên tiêu đề trái như
   * trước, và `navBarClassName` về `undefined` nên thanh tiêu đề không đổi một dòng nào.
   */
  return (
    <ContentLayout
      title={
        titleSlot ? (
          <CreateTitleBar center={titleSlot} />
        ) : (
          t('common:buttons.create', { field: t('common:label.short_link') })
        )
      }
      navBarClassName={titleSlot ? CREATE_TITLE_NAV_CLASS : undefined}
      backPath={`/org/${org_id}/short-links`}
      footer={
        !blocked && (
          <div className="w-full max-w-7xl mx-auto my-auto px-6 lg:px-12">
            <div className="flex gap-4 justify-center">
              <Button type="button" variant="tertiary" onClick={back}>
                {t('common:buttons.cancel')}
              </Button>
              <LoadingButton type="submit" isLoading={isCreating} form={FORM_ID}>
                {t('common:buttons.create', { field: 'Link' })}
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
        <QrCustomizeProvider>
          <ShortLinkForm
            form={form}
            onSubmit={handleSubmit}
            isLoading={isCreating}
            orgQuotaMonthlyTps={orgQuota?.monthly_touch_points ?? 0}
            formId={FORM_ID}
          />
        </QrCustomizeProvider>
        {e2eeTouchPoint && <E2EETouchPointDialog touchPoint={e2eeTouchPoint} />}
        {createdLink && (
          <ShortLinkCreatedDialog
            shortUrl={createdLink.shortUrl}
            qrOptions={createdLink.qrOptions}
            onClose={() => navigateToDetail(createdLink.id)}
          />
        )}
      </ContentBlock>
    </ContentLayout>
  )
}
