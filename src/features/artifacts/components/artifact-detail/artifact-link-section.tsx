'use client'

import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CheckCircle2, CopyIcon, SquareArrowOutUpRight } from 'lucide-react'

import type { ArtifactDTO } from '@/core/types/artifact.type'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { slugMaxLength, slugMinLength } from '@/shared/schemas/slug'

import { normalizeSlugInput } from '../../constants'
import type { ApplyArtifactChanges } from './use-apply-artifact-changes'
import { ArtifactSection, ArtifactNotice } from './artifact-section'

/**
 * Khối Link (spec wave 4 §3.2). Hai link, hai vai khác nhau, và đó là cả lý do khối này tồn tại:
 * **link rút gọn** là thứ in lên mã QR và là thứ người dùng đổi được; **link gốc** `/a/<token>` thì
 * không bao giờ đổi, kể cả khi đổi đường dẫn hay thay file.
 *
 * Không có nút Lưu riêng: ô nhập chỉ ghi nhận ý định, nút "Cập nhật nội dung" ở header mới gọi API
 * (§4). Nút Sao chép / Mở ẩn ngay khi người dùng bắt đầu sửa — sao chép một link chưa tồn tại là
 * cái bẫy khó thấy nhất của khối này.
 *
 * Copy khi đã sửa là một thông báo YÊN TÂM, không phải cảnh báo: bảng `slugs` giữ lịch sử và li2-be
 * phân giải qua bảng đó, nên đường dẫn cũ vẫn chuyển hướng và QR đã in vẫn chạy (quyết định Q1 của
 * chủ sản phẩm, spec §9).
 */
export const ArtifactLinkSection = ({
  artifact,
  link,
  disabled,
}: {
  artifact: ArtifactDTO
  link: ApplyArtifactChanges['link']
  disabled?: boolean
}) => {
  const { t } = useTranslation(['artifact', 'common'])
  const inputId = useId()
  const errorId = useId()

  const isLive = artifact.status === 'live'
  const showError = link.changed && !!link.reason
  const showCopyAndOpen = isLive && !link.changed && !!artifact.short_url

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('common:toast.title_copy'))
  }

  return (
    <ArtifactSection
      id="sec-link"
      title={t('artifact:detail.link.title')}
      lead={t(isLive ? 'artifact:detail.link.lead_live' : 'artifact:detail.link.lead_draft')}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>{t('artifact:detail.link.short_label')}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={inputId}
            value={link.slug}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
            placeholder={t('artifact:create.slug.placeholder')}
            aria-invalid={showError}
            aria-describedby={showError ? errorId : undefined}
            onChange={(e) => link.setSlug(normalizeSlugInput(e.target.value))}
            startAdornment={
              link.host ? (
                <span className="shrink-0 text-s text-slate-500">{link.host}/</span>
              ) : undefined
            }
            className="min-w-[200px] flex-1 font-mono"
          />
          {showCopyAndOpen && (
            <>
              <Button
                type="button"
                variant="secondary"
                iconLeft={<CopyIcon className="size-4" />}
                onClick={() => copy(artifact.short_url as string)}
              >
                {t('common:actions.copy')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                iconLeft={<SquareArrowOutUpRight className="size-4" />}
                onClick={() => window.open(artifact.short_url as string, '_blank')}
              >
                {t('artifact:detail.link.open')}
              </Button>
            </>
          )}
        </div>

        {showError ? (
          <p id={errorId} className="text-xs text-semantic-error">
            {link.reason}
          </p>
        ) : link.changed && isLive ? (
          <ArtifactNotice
            tone="success"
            Icon={CheckCircle2}
            title={t('artifact:detail.link.warn_title')}
            body={t('artifact:detail.link.warn_body', { slug: link.currentSlug })}
          />
        ) : link.changed ? (
          <p className="text-xs text-slate-500">{t('artifact:detail.link.hint_changed_draft')}</p>
        ) : (
          <p className="text-xs text-slate-500">
            {t(isLive ? 'artifact:detail.link.hint_live' : 'artifact:detail.link.hint_draft', {
              min: slugMinLength,
              max: slugMaxLength,
            })}
          </p>
        )}
      </div>

      {/* Link gốc chỉ có nghĩa khi đã live: `/a/<token>` trả 404 với hàng chưa xuất bản. */}
      {isLive && artifact.serve_url && (
        <div className="flex flex-col gap-1.5">
          <Label>{t('artifact:detail.link.origin_label')}</Label>
          <Input
            readOnly
            value={artifact.serve_url}
            aria-label={t('artifact:detail.link.origin_label')}
            className="font-mono text-s"
            endAdornment={
              <button
                type="button"
                aria-label={t('common:actions.copy')}
                onClick={() => copy(artifact.serve_url as string)}
                className="flex items-center text-slate-400 hover:text-slate-700"
              >
                <CopyIcon className="size-4" />
              </button>
            }
          />
          <p className="text-xs text-slate-500">{t('artifact:detail.link.origin_hint')}</p>
        </div>
      )}
    </ArtifactSection>
  )
}
