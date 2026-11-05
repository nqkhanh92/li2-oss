'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { Row } from '@tanstack/react-table'
import {
  CheckCircle2,
  CopyIcon,
  Eye,
  Globe,
  MoreHorizontal,
  MoveRight,
  RefreshCw,
  SquareArrowOutUpRight,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { Options } from 'qr-code-styling'

import type { ArtifactDTO } from '@/core/types/artifact.type'
import { RelativeTime } from '@/shared/components/ui/relative-time'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { QrRenderWithRef } from '@/features/bootstrap/components/qr-render'
import { getQrDefaultOptions } from '@/features/touch-points/constants'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { cn } from '@/shared/lib/utils'

import { formatBytes } from '../../utils/format-bytes'
import { useUpdateArtifactAccess } from '../../hooks/use-artifacts'
import { ArtifactStatusBadge, ArtifactStatusNote } from '../artifact-status-badge'
import { ArtifactAccessBadge } from '../artifact-access-badge'
import { ArtifactDeleteDialog } from '../artifact-delete-button'
import { getArtifactKindView } from '../../utils/artifact-kind'
import { getArtifactAccessView } from '../../utils/artifact-access'

const stripProtocol = (url: string) => url.replace(/^https?:\/\//, '')

/**
 * Thẻ artifact theo khuôn `touchpoint-card` (wave 4 §3.4) — hai danh sách là hai mặt của cùng một
 * thứ, nên chúng phải đọc được bằng cùng một cách: checkbox đầu thẻ, QR 90×90, link + copy ngay
 * trên dòng, thanh lượt quét và nút Phân tích ở bên phải, hàng metadata ở dưới.
 *
 * Menu ⋮ còn ĐÚNG ba mục. "Sao chép link" rời menu vì đã có nút copy ngay trên dòng link, và "Cập
 * nhật nội dung" không mở hộp thoại nữa mà điều hướng tới khối tương ứng ở trang chi tiết — một
 * hộp thoại thay file nổi trên danh sách không cho người dùng thấy bản đang phục vụ.
 */
export const ArtifactCard = ({ row }: { row: Row<ArtifactDTO> }) => {
  const data = row.original
  const { t } = useTranslation(['artifact', 'common'])
  const { orgRouterPush } = useOrganizationStoreProvider()
  const [deleteOpen, setDeleteOpen] = useState(false)
  /**
   * `org_id` của ROUTE, KHÔNG `data.organization_id`. Danh sách gọi `useGetArtifacts(org_id)` với
   * tham số URL — trên LiHi đó là **slug** `khanhqns-organization` — nên key cache của nó mang slug.
   * Thẻ từng truyền UUID của DTO, và `invalidateQueries(artifactKeys.all(UUID))` sau PATCH đánh dấu
   * cũ một key không ai đọc: API trả 200 nhưng thẻ chỉ đổi sau khi tải lại trang. Cùng lý do cho
   * `orgId` của hộp thoại xoá — nó còn `router.push('/org/<org_id>/artifacts')`, và UUID ở đó là một
   * địa chỉ khác địa chỉ người dùng đang mở.
   */
  const params = useParams<{ org_id: string }>()
  const orgId = params?.org_id ?? data.organization_id
  const { mutate: updateAccess } = useUpdateArtifactAccess(orgId)

  const qrOptions = useMemo<Options | null>(
    () => (data.short_url ? getQrDefaultOptions(`${data.short_url}?t=1`) : null),
    [data.short_url]
  )

  const isLive = data.status === 'live'
  const isPublic = data.access_mode === 'public'
  const { Icon: KindIcon, labelKey: kindLabelKey } = getArtifactKindView(data.kind)

  const copyLink = () => {
    if (!data.short_url) return
    navigator.clipboard.writeText(data.short_url)
    toast.success(t('common:toast.title_copy'))
  }

  const makePublic = () => {
    updateAccess(
      { artifact_id: data.id, access_mode: 'public' },
      {
        onSuccess: () => toast.success(t('artifact:list.made_public', { name: data.name })),
        onError: () => toast.error(t('artifact:access.dialog.failed', { mode: '' })),
      }
    )
  }

  return (
    <div
      onClick={() => orgRouterPush(`/artifacts/${data.id}`)}
      className={cn(
        'flex w-full min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-[8px] border border-slate-300 bg-card p-3 transition-colors hover:border-primary md:py-4 md:pl-2 md:pr-4',
        row.getIsSelected?.() && 'bg-neutral-50'
      )}
    >
      <div
        className="flex shrink-0 items-center justify-center px-1 md:px-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          aria-label={t('artifact:list.select_all')}
          checked={row.getIsSelected?.() ?? false}
          onCheckedChange={(value) => row.toggleSelected?.(!!value)}
        />
      </div>

      <div className="hidden h-[90px] w-[90px] shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-white p-2 md:flex">
        {data.path_qr_code ? (
          <div className="relative h-full w-full">
            {/**
             * `updated_at`, không `created_at`: đổi đường dẫn ghi ảnh QR mới vào CÙNG một path, nên
             * mốc tạo không bao giờ đổi và trình duyệt tiếp tục hiện mã QR của đường dẫn cũ.
             */}
            <Image
              src={`${data.path_qr_code}?v=${new Date(data.updated_at).getTime()}`}
              alt=""
              fill
              className="object-contain"
            />
          </div>
        ) : qrOptions ? (
          <QrRenderWithRef
            size={74}
            qrOptions={qrOptions}
            border={false}
            className="h-full w-full p-0"
          />
        ) : (
          <KindIcon className="h-7 w-7 text-slate-300" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:px-2">
        <div className="flex min-w-0 gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate text-s font-medium text-foreground">{data.name}</p>
              <ArtifactStatusBadge status={data.status} />
            </div>

            {isLive ? (
              data.short_url ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="max-w-[180px] shrink-0 truncate text-s font-medium text-secondary-blue lg:max-w-[300px]">
                    {stripProtocol(data.short_url)}
                  </span>
                  <div
                    className="flex shrink-0 items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      aria-label={t('artifact:actions.copy_link')}
                      onClick={copyLink}
                      className="flex items-center justify-center rounded-full p-1.5 hover:bg-slate-100"
                    >
                      <CopyIcon className="size-4 text-secondary" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('artifact:actions.open')}
                      onClick={() => window.open(data.short_url as string, '_blank')}
                      className="flex items-center justify-center rounded-full p-1.5 hover:bg-slate-100"
                    >
                      <SquareArrowOutUpRight className="size-4 text-secondary-blue" />
                    </button>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <MoveRight className="size-3 shrink-0 text-slate-400" />
                    <p className="min-w-0 truncate text-s text-slate-500">
                      {data.name} · {formatBytes(data.size_bytes)}
                    </p>
                  </div>
                </div>
              ) : (
                /* Touch point bị xoá bên short-links: artifact vẫn live, chỉ mất đường vào */
                <p className="text-xs text-slate-500">{t('artifact:list.link_deleted')}</p>
              )
            ) : (
              <ArtifactStatusNote status={data.status} />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
            {isLive && (
              <>
                <div
                  data-testid="artifact-card-visits"
                  className="hidden items-center gap-1 rounded-[6px] border border-slate-200 bg-slate-50 px-3 py-1 md:flex"
                >
                  <Eye className="size-3.5 text-secondary-blue" />
                  <span className="whitespace-nowrap text-xs text-slate-600">{data.visits}</span>
                </div>
              </>
            )}

            {/**
             * Thẻ là `div onClick` điều hướng, và sự kiện React nổi qua cả portal — nên menu VÀ hộp
             * thoại xoá cùng nằm trong một `div` chặn nổi, như các nút ở trên đã làm.
             */}
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="icon"
                    aria-label={t('artifact:actions.more')}
                    className="h-8 w-8"
                  >
                    <MoreHorizontal className="size-4 text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => orgRouterPush(`/artifacts/${data.id}#sec-replace`)}
                  >
                    <RefreshCw />
                    {t('artifact:actions.update_content')}
                  </DropdownMenuItem>
                  {/**
                   * Đã công khai thì mục này là một CÂU TRẢ LỜI, không phải một nút: bấm lại cũng
                   * không đổi gì, nên nó bị khoá kèm một dòng nói rõ hiện trạng.
                   */}
                  {isPublic ? (
                    <DropdownMenuItem
                      aria-disabled
                      onSelect={(e) => e.preventDefault()}
                      className="flex-col items-start gap-0 focus:bg-transparent"
                    >
                      <span className="flex items-center gap-2">
                        <Globe className="size-4" />
                        {t('artifact:list.menu.make_public')}
                        <CheckCircle2 className="size-3.5 text-semantic-success" />
                      </span>
                      <span className="pl-6 text-xs text-slate-500">
                        {t('artifact:list.menu.public_now_sub')}
                      </span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onSelect={makePublic}
                      title={t('artifact:list.menu.make_public_tip', {
                        mode: t(getArtifactAccessView(data.access_mode).labelKey),
                      })}
                    >
                      <Globe />
                      {t('artifact:list.menu.make_public')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-semantic-error focus:text-semantic-error"
                    onSelect={() => setDeleteOpen(true)}
                  >
                    <Trash2 />
                    {t('artifact:actions.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ArtifactDeleteDialog
                orgId={orgId}
                artifactId={data.id}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
              />
            </div>
          </div>
        </div>

        {/* Hàng metadata: loại · quyền xem · mốc thời gian. Không avatar — DTO chưa có profile. */}
        <div className="hidden items-center gap-3 text-xs text-slate-500 md:flex">
          <span className="flex items-center gap-1">
            <KindIcon className="size-3.5 text-slate-400" />
            {t(kindLabelKey)}
          </span>
          <ArtifactAccessBadge mode={data.access_mode} />
          <span className="whitespace-nowrap">{formatBytes(data.size_bytes)}</span>
          <span className="flex-1" />
          <span className="flex items-center gap-1 whitespace-nowrap">
            {t(isLive ? 'artifact:list.updated_rel' : 'artifact:list.created_rel', { time: '' })}
            <RelativeTime date={isLive ? data.updated_at : data.created_at} />
          </span>
        </div>
      </div>
    </div>
  )
}
