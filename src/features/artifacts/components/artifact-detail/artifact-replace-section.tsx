'use client'

import { useId } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, CircleSlash, Download, Link2, Lock } from 'lucide-react'

import {
  isArtifactUploadKind,
  type ArtifactDTO,
  type ReplaceArtifactResult,
} from '@/core/types/artifact.type'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

import { useArtifactQuota } from '../../hooks/use-artifacts'
import { ArtifactDropzone } from '../artifact-create/artifact-dropzone'
import { formatBytes } from '../../utils/format-bytes'
import { getArtifactKindView } from '../../utils/artifact-kind'
import { ArtifactNotice, ArtifactSection } from './artifact-section'
import type { ApplyArtifactChanges } from './use-apply-artifact-changes'
import { getArtifactBackPath } from '@/features/artifacts/utils/list-path'

const stripProtocol = (url: string) => url.replace(/^https?:\/\//, '')

/**
 * Khối Cập nhật nội dung (spec wave 4 §3.2) — phần thân của hộp thoại thay file cũ, trừ nút Cập
 * nhật: nút đó đã chuyển lên header thành nút lưu gộp, nên khối này chỉ chọn file và nói hệ
 * quả. Toàn bộ phép kiểm (đuôi file, quá cỡ, delta quota) nằm ở `useApplyArtifactChanges` vì nút
 * ở header phải chặn được trước khi gọi API.
 */
export const ArtifactReplaceSection = ({
  orgId,
  artifact,
  replace,
  disabled,
}: {
  orgId: string
  artifact: ArtifactDTO
  replace: ApplyArtifactChanges['replace']
  disabled?: boolean
}) => {
  const { t } = useTranslation(['artifact', 'common'])
  const router = useRouter()
  const reasonId = useId()
  const { data: quota } = useArtifactQuota(orgId)

  const isDraft = artifact.status === 'draft'
  const shortLink = artifact.short_url ? stripProtocol(artifact.short_url) : null
  const currentKind = getArtifactKindView(artifact.kind)
  const { file, phase, fileIssue, quotaIssue, nextKind, delta } = replace
  const kindChanges = !!nextKind && nextKind !== artifact.kind

  return (
    <ArtifactSection
      id="sec-replace"
      title={t('artifact:update.title')}
      lead={
        <>
          {t('artifact:update.description', { name: artifact.name })}{' '}
          {t(isDraft ? 'artifact:detail.replace.lead_draft' : 'artifact:detail.replace.lead_live')}
        </>
      }
    >
      {phase === 'gone' ? (
        <div className="flex flex-col gap-3">
          <ArtifactNotice
            tone="error"
            Icon={CircleSlash}
            title={t('artifact:update.gone_title')}
            body={t('artifact:update.gone_mid_flight')}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => router.push(`/org/${orgId}/artifacts/create`)}
          >
            {t('artifact:update.create_new')}
          </Button>
        </div>
      ) : phase === 'done' && replace.result ? (
        <DoneBlocks
          result={replace.result}
          isDraft={isDraft}
          shortLink={shortLink}
          usedBytes={quota?.used_bytes ?? null}
          quotaBytes={quota?.quota_bytes ?? null}
          onDone={replace.reset}
        />
      ) : (
        <>
          {phase === 'select' && (
            <ArtifactDropzone
              file={file}
              onFileChange={replace.setFile}
              error={fileIssue}
              disabled={disabled}
            />
          )}

          {file && !fileIssue && nextKind && (
            <DiffTable
              before={{
                name: artifact.name,
                kindLabel: t(currentKind.labelKey),
                size: artifact.size_bytes,
                Icon: currentKind.Icon,
              }}
              after={{
                name: file.name,
                kindLabel: t(getArtifactKindView(nextKind).labelKey),
                size: file.size,
                Icon: getArtifactKindView(nextKind).Icon,
              }}
            />
          )}

          {phase === 'uploading' && file && (
            <ProgressBlock
              percent={replace.progress}
              sent={formatBytes((file.size * replace.progress) / 100)}
              total={formatBytes(file.size)}
              note={
                isDraft || !shortLink
                  ? t('artifact:update.progress_note_draft')
                  : t('artifact:update.progress_note', { link: shortLink })
              }
            />
          )}

          {phase === 'select' && file && !fileIssue && nextKind && (
            <>
              {kindChanges && (
                <ArtifactNotice
                  tone="warning"
                  Icon={AlertTriangle}
                  title={t('artifact:update.kind_change_title', {
                    from: t(currentKind.labelKey),
                    to: t(getArtifactKindView(nextKind).labelKey),
                  })}
                  body={
                    isDraft
                      ? t('artifact:update.kind_change_body_draft', {
                          to_viewer: t(`artifact:update.viewer.${nextKind}`),
                        })
                      : t('artifact:update.kind_change_body', {
                          to_viewer: t(`artifact:update.viewer.${nextKind}`),
                          from_viewer: isArtifactUploadKind(artifact.kind)
                            ? t(`artifact:update.viewer.${artifact.kind}`)
                            : t('artifact:kind.unknown'),
                        })
                  }
                />
              )}

              {quotaIssue ? (
                <div className="flex flex-col gap-1">
                  <p id={reasonId} className="text-s text-semantic-error">
                    {quotaIssue}
                  </p>
                  <button
                    type="button"
                    className="self-start text-xs text-secondary-blue underline"
                    onClick={() => router.push(getArtifactBackPath(orgId))}
                  >
                    {t('artifact:update.quota_view_usage')}
                  </button>
                </div>
              ) : (
                <SizeAfterBlock
                  delta={delta}
                  usedBytes={quota?.used_bytes ?? null}
                  quotaBytes={quota?.quota_bytes ?? null}
                  liveCount={quota?.live_count ?? null}
                  liveQuota={quota?.live_quota ?? null}
                />
              )}

              {isDraft || !shortLink ? (
                <ArtifactNotice
                  tone="neutral"
                  Icon={Link2}
                  title={t('artifact:update.draft_no_link_title')}
                  body={t('artifact:update.draft_no_link_body')}
                />
              ) : (
                <ArtifactNotice
                  tone="success"
                  Icon={CheckCircle2}
                  title={t('artifact:update.keep_qr_title')}
                  body={t('artifact:update.keep_qr_body')}
                />
              )}

              <ArtifactNotice
                tone="neutral"
                Icon={Lock}
                title={t('artifact:update.lose_old_title')}
                body={t('artifact:update.lose_old_body', { name: artifact.name })}
                /**
                 * Đúng MỘT lối ra, và chỉ khi `live`: `/a/<token>/download` trả 404 cho draft, nên
                 * ở draft link này bị ẩn thay vì trỏ vào một trang lỗi.
                 */
                action={
                  !isDraft && artifact.download_url ? (
                    <a
                      href={artifact.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-secondary-blue underline"
                    >
                      <Download className="size-3.5" />
                      {t('artifact:update.lose_old_download')}
                    </a>
                  ) : null
                }
              />
            </>
          )}
        </>
      )}
    </ArtifactSection>
  )
}

type DiffSide = { name: string; kindLabel: string; size: number; Icon: React.ElementType }

/** Bảng *Đang phục vụ → Sẽ thay bằng*: trả lời "tôi đang đổi cái gì lấy cái gì". */
const DiffTable = ({ before, after }: { before: DiffSide; after: DiffSide }) => {
  const { t } = useTranslation('artifact')
  const Row = ({ label, side }: { label: string; side: DiffSide }) => (
    <div className="grid grid-cols-[96px_1fr_auto_auto] items-center gap-3 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-s text-slate-700">
        <side.Icon className="size-4 shrink-0 text-slate-400" />
        <span className="truncate" title={side.name}>
          {side.name}
        </span>
      </span>
      <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
        {side.kindLabel}
      </span>
      <span className="whitespace-nowrap text-xs text-slate-500">{formatBytes(side.size)}</span>
    </div>
  )
  return (
    <div className="divide-y divide-slate-100 rounded-[8px] border border-slate-200">
      <Row label={t('update.serving')} side={before} />
      <Row label={t('update.will_replace')} side={after} />
    </div>
  )
}

/**
 * Dung lượng sau khi đổi, nói bằng PHẦN CHÊNH chứ không bằng tổng file mới: thay 3.3 MB bằng 7.8 MB
 * tốn thêm 4.5 MB, nói "cần 7.8 MB" là doạ người dùng bằng một con số sai.
 */
const SizeAfterBlock = ({
  delta,
  usedBytes,
  quotaBytes,
  liveCount,
  liveQuota,
}: {
  delta: number
  usedBytes: number | null
  quotaBytes: number | null
  liveCount: number | null
  liveQuota: number | null
}) => {
  const { t } = useTranslation('artifact')
  const hasQuota = usedBytes !== null && quotaBytes !== null
  const after = hasQuota ? Math.max(usedBytes + delta, 0) : null
  const ratio = hasQuota && after !== null ? Math.min(after / quotaBytes, 1) : 0
  const ratioBefore = hasQuota ? Math.min(usedBytes / quotaBytes, 1) : 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{t('update.size_after')}</span>
        {hasQuota && after !== null && (
          <span className="text-xs text-slate-500">
            {t('update.size_after_values', {
              before: formatBytes(usedBytes),
              after: formatBytes(after),
              quota: formatBytes(quotaBytes),
            })}
          </span>
        )}
      </div>
      {hasQuota && (
        <div
          role="progressbar"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${Math.min(ratio, ratioBefore) * 100}%` }}
          />
          {/* Lớp thứ hai: phần chênh — chỗ sẽ tăng (hay giảm) sau khi đổi. */}
          <div
            className={cn(
              'absolute inset-y-0 rounded-full',
              delta >= 0 ? 'bg-primary/40' : 'bg-slate-300'
            )}
            style={{
              left: `${Math.min(ratio, ratioBefore) * 100}%`,
              width: `${Math.abs(ratio - ratioBefore) * 100}%`,
            }}
          />
        </div>
      )}
      <p className="text-xs text-slate-500">
        {delta > 0
          ? t('update.delta_heavier', { delta: formatBytes(delta) })
          : delta < 0
            ? t('update.delta_lighter', { delta: formatBytes(-delta) })
            : t('update.delta_same')}
        {liveCount !== null && liveQuota !== null && (
          <> {t('update.live_unchanged', { live: liveCount, quota: liveQuota })}</>
        )}
        {hasQuota && after !== null && (
          <> {t('update.free_remaining', { free: formatBytes(Math.max(quotaBytes - after, 0)) })}</>
        )}
      </p>
    </div>
  )
}

/** Phần trăm THẬT từ `onUploadProgress`, không phải thanh chạy giả. */
const ProgressBlock = ({
  percent,
  sent,
  total,
  note,
}: {
  percent: number
  sent: string
  total: string
  note: string
}) => {
  const { t } = useTranslation('artifact')
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{t('create.uploading')}</span>
        <span className="text-xs tabular-nums text-slate-600">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('create.uploading')}
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        {t('update.progress_sent', { sent, total })} {note}
      </p>
    </div>
  )
}

/** Hai khối, không phải một: "Đã đổi" là thứ họ vừa làm; "Không đổi" là thứ họ vừa cứu được. */
const DoneBlocks = ({
  result,
  isDraft,
  shortLink,
  usedBytes,
  quotaBytes,
  onDone,
}: {
  result: ReplaceArtifactResult
  isDraft: boolean
  shortLink: string | null
  usedBytes: number | null
  quotaBytes: number | null
  onDone: () => void
}) => {
  const { t } = useTranslation('artifact')
  const storage =
    usedBytes !== null && quotaBytes !== null
      ? ` ${t('update.storage_in_use', {
          used: formatBytes(usedBytes),
          quota: formatBytes(quotaBytes),
        })}`
      : ''
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5 text-semantic-success" />
        <p className="text-m font-semibold text-slate-800">{t('update.done_title')}</p>
      </div>
      <ArtifactNotice
        tone="neutral"
        Icon={CheckCircle2}
        title={t('update.changed')}
        body={
          (isDraft || !shortLink
            ? t('update.changed_body_draft', {
                name: result.name,
                size: formatBytes(result.size_bytes),
              })
            : t('update.changed_body', {
                link: shortLink,
                name: result.name,
                size: formatBytes(result.size_bytes),
              })) + storage
        }
      />
      <ArtifactNotice
        tone="success"
        Icon={Lock}
        title={t('update.unchanged')}
        body={isDraft || !shortLink ? t('update.unchanged_body_draft') : t('update.unchanged_body')}
      />
      <Button type="button" size="sm" className="self-end" onClick={onDone}>
        {t('update.done')}
      </Button>
    </div>
  )
}
