'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import type { ArtifactAccessMode } from '@/core/types/artifact.type'

import { getArtifactAccessView } from '../../utils/artifact-access'

/**
 * Một DÒNG "ai đã mở cái này?" trên trang chi tiết — KHÔNG phải một bảng. Danh sách đầy đủ thuộc
 * phần Khách hàng (chủ sản phẩm chốt 2026-11-01); ở đây chỉ có con số và đường dẫn sang đó, vì câu
 * hỏi được hỏi từ artifact mà câu trả lời sống ở Khách hàng.
 *
 * Ba câu, và lẫn chúng là nói sai với người dùng:
 *
 * - `google` + có người → `{n} người đã mở · xem danh sách`.
 * - `google` + chưa ai → **chưa ai mở**. Chỉ ở chế độ này câu đó mới đúng được.
 * - chế độ khác → Li2 **không thu được** email. Đây KHÔNG phải "0 người đã mở": người xem vẫn vào,
 *   ta chỉ không biết họ là ai. Nói "0" ở đây là nói sai, và 28/32 artifact trên LiHi đang ở ca này.
 *
 * ⚠ Ca thứ tư — từng ở `google` (đã ghi được người xem), nay đã đổi sang `public`/`password`. Rơi
 * vào nhánh "không thu được email" vì `viewer_count` của DTO chỉ được tính khi chế độ HIỆN TẠI là
 * `google` (xem `getForOrg`). Đó là lựa chọn có chủ ý: một con số cũ đứng cạnh một chế độ không còn
 * thu nữa trông như đang đếm đúng, và nó không đúng. Những người đã ghi được vẫn còn, và đường dẫn
 * `?artifact_id=` ở ngay dòng này dẫn tới họ trong Khách hàng.
 */
export const ArtifactViewersLine = ({
  orgId,
  artifactId,
  mode,
  viewerCount,
}: {
  orgId: string
  artifactId: string
  mode: ArtifactAccessMode
  /** `null` = chế độ hiện tại không thu email, hoặc lần đếm đó hỏng. Không bao giờ nghĩa là "0". */
  viewerCount: number | null
}) => {
  const { t } = useTranslation(['artifact', 'common'])

  const customersHref = `/org/${orgId}/customers?artifact_id=${artifactId}`
  const collectsIdentity = mode === 'google'

  /**
   * `google` mà vẫn `null` là lần đếm hỏng (`countViewersSafely` nuốt lỗi) — không phải "chưa ai
   * mở". Không có con số nào nói được thì không nói con số nào; đường dẫn sang Khách hàng vẫn còn.
   */
  const count = collectsIdentity ? viewerCount : null

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-s font-medium text-slate-600">{t('artifact:access.who_viewed')}</span>

      {!collectsIdentity ? (
        <div className="flex flex-col gap-1">
          <p className="text-s text-slate-700">{t('artifact:access.viewers.anonymous')}</p>
          <p className="text-xs text-slate-500">
            {t('artifact:access.viewers.anonymous_hint', {
              mode: t(getArtifactAccessView(mode).labelKey),
            })}
          </p>
          <Link
            href={customersHref}
            className="self-start text-xs font-medium text-secondary-blue hover:underline"
          >
            {t('artifact:access.viewers.anonymous_link')}
          </Link>
        </div>
      ) : count === null ? (
        <Link
          href={customersHref}
          className="self-start text-s font-medium text-secondary-blue hover:underline"
        >
          {t('artifact:access.viewers.anonymous_link')}
        </Link>
      ) : count === 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-s text-slate-700">{t('artifact:access.viewers.none')}</p>
          <p className="text-xs text-slate-500">{t('artifact:access.viewers.none_hint')}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-s text-slate-700">
            {t('artifact:access.viewer_count', { count })}
          </span>
          <Link
            href={customersHref}
            className="text-s font-medium text-secondary-blue hover:underline"
          >
            {t('artifact:access.who_viewed_link')}
          </Link>
        </div>
      )}
    </div>
  )
}
