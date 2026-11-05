'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import type { Options } from 'qr-code-styling'

import type { ArtifactDTO } from '@/core/types/artifact.type'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { RelativeTime } from '@/shared/components/ui/relative-time'
import { Button } from '@/shared/components/ui/button'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { QrPreviewCard } from '@/features/short-links/components/short-link-form/qr-preview-card'
import { getQrDefaultOptions } from '@/features/touch-points/constants'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'

import {
  ARTIFACT_PHASE1_ACCESS_MODES,
  useArtifactAccessModes,
  usePublishArtifact,
  useShowArtifact,
} from '../../hooks/use-artifacts'
import { formatBytes } from '../../utils/format-bytes'
import { getArtifactKindView } from '../../utils/artifact-kind'
import { ArtifactStatusBadge } from '../artifact-status-badge'
import { ArtifactPreview } from './artifact-preview'
import { ArtifactSection } from './artifact-section'
import { ArtifactDetailHeader } from './artifact-detail-header'
import { ArtifactLinkSection } from './artifact-link-section'
import { ArtifactReplaceSection } from './artifact-replace-section'
import { ArtifactAccessSection } from './artifact-access-section'
import { useApplyArtifactChanges } from './use-apply-artifact-changes'
import { getArtifactBackPath } from '@/features/artifacts/utils/list-path'

const MetaRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
    <span className="shrink-0 text-xs text-slate-500">{label}</span>
    <span className="truncate text-s text-slate-700">{children}</span>
  </div>
)

/**
 * Trang chi tiết artifact — MỘT trang cuộn (quyết định của chủ sản phẩm, `log.md` 2026-10-11), không
 * sidebar tab: năm khối xếp theo thứ tự câu hỏi người dùng hỏi khi mở trang này ra (link của tôi là
 * gì → đổi nội dung thế nào → nó đang trông ra sao → ai xem được → bao nhiêu người đã quét).
 */
export const ArtifactDetail = () => {
  const { org_id, artifact_id } = useParams<{ org_id: string; artifact_id: string }>()
  const router = useRouter()
  const { t } = useTranslation(['artifact', 'common'])
  const { data: artifact, isLoading, isError } = useShowArtifact(org_id, artifact_id)

  if (isLoading) {
    return (
      <ContentLayout title={t('artifact:detail.title')} backPath={getArtifactBackPath(org_id)}>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-56 rounded" />
          <Skeleton className="h-[420px] w-full rounded-[16px]" />
        </div>
      </ContentLayout>
    )
  }

  /**
   * Hàng `removed` trả 404 từ `getForOrg` (quyết định Q5: giữ 404, không làm trang bia mộ) — nên
   * "không tìm thấy" là câu trả lời đúng cho cả ba trường hợp: không tồn tại, không thuộc org, đã gỡ.
   */
  if (isError || !artifact) {
    return (
      <ContentLayout title={t('artifact:detail.title')} backPath={getArtifactBackPath(org_id)}>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-16 text-center">
          <p className="text-s text-slate-500">{t('artifact:detail.not_found')}</p>
          <Button variant="secondary" onClick={() => router.push(getArtifactBackPath(org_id))}>
            {t('artifact:detail.back_to_list')}
          </Button>
        </div>
      </ContentLayout>
    )
  }

  return <ArtifactDetailView orgId={org_id} artifact={artifact} />
}

/**
 * Tách khỏi phần nạp dữ liệu là có chủ ý: `useApplyArtifactChanges` khởi tạo state từ DTO (slug
 * hiện tại, chế độ xem hiện tại), nên nó phải được gọi khi DTO đã có — không thì giá trị khởi tạo
 * là của một artifact rỗng và người dùng thấy ô đường dẫn trống trên một hàng đang live.
 */
const ArtifactDetailView = ({ orgId, artifact }: { orgId: string; artifact: ArtifactDTO }) => {
  const router = useRouter()
  const { t } = useTranslation(['artifact', 'common'])
  const { organization } = useOrganizationStoreProvider()
  const { data: accessModes } = useArtifactAccessModes(orgId)
  const { mutate: publish, isPending: isPublishing } = usePublishArtifact(orgId)

  const changes = useApplyArtifactChanges({ orgId, artifact })

  const isLive = artifact.status === 'live'
  const isDraft = artifact.status === 'draft'
  const kindView = getArtifactKindView(artifact.kind)

  /**
   * QR dựng từ `short_url` (không phải `serve_url`): thứ in lên giấy là link ngắn, và đó cũng là lý
   * do đổi đường dẫn thì QR phải sinh lại. Draft chưa có link nên QR chỉ là chỗ giữ hình, kèm nhãn
   * nói rõ phải xuất bản trước.
   */
  const qrOptions = useMemo<Options>(
    () => getQrDefaultOptions(`${artifact.short_url ?? artifact.serve_url ?? ''}?t=1`),
    [artifact.short_url, artifact.serve_url]
  )

  const handlePublish = () => {
    publish(
      { artifact_id: artifact.id, slug: changes.link.slug.trim() || undefined },
      {
        onError: (error) => {
          // 409 = ai đó (hoặc tab khác) đã xuất bản rồi. Đó không phải lỗi của người đang bấm.
          if (error instanceof AxiosError && error.response?.status === 409) {
            toast.success(t('artifact:detail.already_published'))
            return
          }
          toast.error(t('artifact:errors.generic'))
        },
      }
    )
  }

  return (
    <ContentLayout
      title={
        <ArtifactDetailHeader
          orgId={orgId}
          artifact={artifact}
          changes={changes}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      }
      isBackable={false}
      navBarClassName="py-2 h-[60px] w-full [&_#content-layout-title]:w-full"
    >
      <div className="flex flex-col gap-5 xl:flex-row">
        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-card">
          <ArtifactLinkSection
            artifact={artifact}
            link={changes.link}
            disabled={changes.applying}
          />

          <ArtifactReplaceSection
            orgId={orgId}
            artifact={artifact}
            replace={changes.replace}
            disabled={changes.applying}
          />

          <ArtifactSection id="sec-preview" title={t('artifact:detail.preview_label')}>
            <div className="flex flex-wrap items-center gap-2">
              <ArtifactStatusBadge status={artifact.status} />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs leading-4 text-slate-500">
                {t(kindView.labelKey)}
              </span>
              <span className="text-xs text-slate-500">
                {isLive
                  ? t('artifact:detail.preview.published_updated', { published: '', updated: '' })
                  : t('artifact:detail.preview.created', { created: '' })}
                <RelativeTime date={isLive ? artifact.updated_at : artifact.created_at} />
              </span>
            </div>
            {isLive && artifact.kind === 'html' && (
              <p className="text-xs text-slate-500">{t('artifact:detail.preview.serving_note')}</p>
            )}
            <ArtifactPreview artifact={artifact} hideLabel />
          </ArtifactSection>

          <ArtifactAccessSection
            orgId={orgId}
            artifact={artifact}
            access={changes.access}
            modes={accessModes?.modes ?? ARTIFACT_PHASE1_ACCESS_MODES}
            orgName={organization?.name ?? ''}
            disabled={changes.applying}
          />
        </div>

        <div className="flex shrink-0 flex-col gap-4 xl:w-[252px] 2xl:w-[302px]">
          <div className="rounded-xl border border-slate-200 bg-card p-4">
            <TooltipProvider delayDuration={200}>
              <QrPreviewCard
                qrOptions={qrOptions}
                isEditMode={isLive}
                hideCustomize
                lockedTooltip={t('artifact:detail.qr.publish_first')}
              />
            </TooltipProvider>
            {isDraft && (
              <p className="pt-2 text-xs text-slate-500">
                {t('artifact:detail.qr.publish_first_hint')}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-card px-4 py-2">
            <p className="py-2 text-s font-medium text-slate-600">
              {t('artifact:detail.file_info')}
            </p>
            <MetaRow label={t('artifact:detail.meta.name')}>{artifact.name}</MetaRow>
            {/* Enum thô (`html`, `slides`) là từ vựng của DB, không phải của người đọc. */}
            <MetaRow label={t('artifact:detail.meta.kind')}>{t(kindView.labelKey)}</MetaRow>
            <MetaRow label={t('artifact:detail.meta.size')}>
              {formatBytes(artifact.size_bytes)}
            </MetaRow>
            <MetaRow label={t('artifact:detail.meta.created_at')}>
              <RelativeTime date={artifact.created_at} />
            </MetaRow>
            <MetaRow label={t('artifact:detail.meta.updated_at')}>
              <RelativeTime date={artifact.updated_at} />
            </MetaRow>
          </div>

          <Button
            type="button"
            variant="tertiary"
            size="sm"
            className="self-start"
            onClick={() => router.push(getArtifactBackPath(orgId))}
          >
            {t('artifact:detail.back_to_list')}
          </Button>
        </div>
      </div>
    </ContentLayout>
  )
}
