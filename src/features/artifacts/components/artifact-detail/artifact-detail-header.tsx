'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CopyIcon,
  Download,
  MoreHorizontalIcon,
  RefreshCw,
  ScanEye,
  Share2Icon,
  SquareArrowOutUpRight,
  TrashIcon,
} from 'lucide-react'

import type { ArtifactDTO } from '@/core/types/artifact.type'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { SharingModal } from '@/features/touch-points/components/sharing'

import { ArtifactStatusBadge } from '../artifact-status-badge'
import { ArtifactPrimaryAction } from '../artifact-primary-action'
import { ArtifactDeleteDialog } from '../artifact-delete-button'
import type { ApplyArtifactChanges } from './use-apply-artifact-changes'
import { getArtifactBackPath } from '@/features/artifacts/utils/list-path'

const stripProtocol = (url: string) => url.replace(/^https?:\/\//, '')

/**
 * Header trang chi tiết, cùng khuôn với `ShortLinkDetailHeader` (:86-174) — hai trang là hai mặt
 * của cùng một thứ (một đường dẫn ngắn trỏ vào một đích), nên chúng không được có hai header khác
 * hình.
 *
 * Nút CHÍNH ở đây là nút lưu gộp: nó áp cả ba thay đổi đang chờ dưới trang, và nhãn mang theo số
 * đếm vì "Cập nhật nội dung" một mình không nói được là nó sắp làm mấy việc. Draft thì việc chính
 * là Xuất bản, và nút gộp chỉ hiện khi thật sự có gì để áp — một nút "(0)" là một nút không có việc.
 */
export const ArtifactDetailHeader = ({
  orgId,
  artifact,
  changes,
  onPublish,
  isPublishing,
}: {
  orgId: string
  artifact: ArtifactDTO
  changes: ApplyArtifactChanges
  onPublish: () => void
  isPublishing?: boolean
}) => {
  const { t } = useTranslation(['artifact', 'common'])
  const router = useRouter()
  const [sharingOpen, setSharingOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const isLive = artifact.status === 'live'
  const isDraft = artifact.status === 'draft'
  const shortLink = artifact.short_url ? stripProtocol(artifact.short_url) : null

  const copyShortLink = () => {
    if (!artifact.short_url) return
    navigator.clipboard.writeText(artifact.short_url)
    toast.success(t('common:toast.title_copy'))
  }

  const mergedLabel =
    changes.count > 0
      ? t('artifact:detail.apply.label_count', { count: changes.count })
      : t('artifact:actions.update_content')

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <ArrowLeft
        className="size-5 shrink-0 cursor-pointer text-slate-500"
        aria-label={t('artifact:detail.back_to_list')}
        onClick={() => router.push(getArtifactBackPath(orgId))}
      />

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isLive && shortLink ? (
          <>
            <span className="truncate text-s font-medium text-foreground" title={shortLink}>
              {shortLink}
            </span>
            <Button
              type="button"
              variant="table"
              aria-label={t('artifact:actions.copy_link')}
              className="size-7 text-secondary-purple"
              onClick={copyShortLink}
            >
              <CopyIcon className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <span className="truncate text-s font-medium text-foreground">{artifact.name}</span>
            <ArtifactStatusBadge status={artifact.status} />
          </>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {isLive && (
          <div
            data-testid="artifact-visits"
            className="flex h-9 items-center gap-1 rounded-[6px] border border-slate-200 bg-slate-50 px-3"
          >
            <ScanEye className="size-[18px] text-secondary-blue" />
            <span className="whitespace-nowrap text-s font-medium text-slate-600">
              {artifact.visits}
            </span>
          </div>
        )}

        {isDraft && (
          <LoadingButton type="button" size="sm" isLoading={isPublishing} onClick={onPublish}>
            {t('artifact:actions.publish')}
          </LoadingButton>
        )}

        {/**
         * `blocked` / `expired` / `quarantined`: nút khoá kèm lý do vẫn do `ArtifactPrimaryAction`
         * lo — ở những trạng thái đó không có gì để "cập nhật", chỉ có một việc duy nhất phải làm.
         */}
        {!isLive && !isDraft && (
          <ArtifactPrimaryAction
            status={artifact.status}
            onPublish={onPublish}
            onReupload={() => router.push(`/org/${orgId}/artifacts/create`)}
            onReplace={() => {}}
            isPending={isPublishing}
            size="sm"
          />
        )}

        {(isLive || (isDraft && changes.count > 0)) && (
          <LoadingButton
            type="button"
            size="sm"
            busy={changes.applying}
            title={changes.tooltip}
            iconLeft={changes.applying ? undefined : <RefreshCw />}
            onClick={() => void changes.apply()}
          >
            {changes.applying ? t('artifact:update.submitting') : mergedLabel}
          </LoadingButton>
        )}

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={t('artifact:actions.more')}
              className="shrink-0"
            >
              <MoreHorizontalIcon className="size-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isLive && artifact.short_url ? (
              <>
                <DropdownMenuItem onSelect={() => setSharingOpen(true)}>
                  <Share2Icon />
                  {t('common:buttons.share')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => window.open(artifact.serve_url as string, '_blank')}
                >
                  <SquareArrowOutUpRight />
                  {t('artifact:actions.open_new_tab')}
                </DropdownMenuItem>
              </>
            ) : (
              /* Chưa xuất bản thì chưa có gì để chia sẻ — khoá kèm lý do TẠI CHỖ, không tooltip. */
              <DropdownMenuItem disabled className="flex-col items-start gap-0">
                <span className="flex items-center gap-2">
                  <Share2Icon className="size-4" />
                  {t('common:buttons.share')}
                </span>
                <span className="pl-6 text-xs text-slate-500">
                  {t('artifact:actions.copy_link_locked')}
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={!artifact.download_url}
              onSelect={() => window.open(artifact.download_url as string, '_blank')}
            >
              <Download />
              {t('artifact:actions.download')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-semantic-error focus:text-semantic-error"
              onSelect={() => setDeleteOpen(true)}
            >
              <TrashIcon />
              {t('artifact:actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ArtifactDeleteDialog
        orgId={orgId}
        artifactId={artifact.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <SharingModal open={sharingOpen} onOpenChange={setSharingOpen} url={artifact.short_url} />
    </div>
  )
}
