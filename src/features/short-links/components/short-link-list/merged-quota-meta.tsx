'use client'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

import { useArtifactQuota } from '@/features/artifacts/hooks/use-artifacts'
import { useGetLinkCount } from '@/features/touch-points/hooks/queries'
import { formatBytes } from '@/features/artifacts/utils/format-bytes'

/**
 * `24 link · 3/50 artifact · 4,2 MB/30 MB` trên header danh sách gộp.
 *
 * Số artifact và dung lượng lấy từ `GET …/artifacts/quota` — KHÔNG đếm lại từ các hàng đang hiện.
 * Danh sách chỉ có một trang trong tay, và trang đó còn chứa cả artifact `removed` (chúng vẫn có
 * touch point), nên đếm từ hàng sẽ ra một con số vừa sai vừa đổi theo trang.
 *
 * Mỗi mẩu tự hiện khi dữ liệu của nó về, không chờ nhau: hai query độc lập, và một header trống
 * trơn cho tới khi cả hai xong thì nhấp nháy lâu hơn mức cần.
 *
 * ⚠ Nhưng "chưa về" và "hỏng" phải trông KHÁC nhau. Bản trước gộp hai ca: cả hai đều làm mẩu đó
 * biến mất, nên khi endpoint link-count trả 500 thì chuỗi `3 link ·` lặng lẽ rụng khỏi header và
 * phần còn lại trông vẫn hoàn chỉnh. Một con số biến mất không dấu vết khó phát hiện hơn hẳn một
 * thông báo lỗi — đo được trong bài ép 500. Nay lỗi để lại một chỗ trống nhìn thấy (`—`).
 */
export const MergedQuotaMeta = () => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation(['touchpoint'])
  const { data: linkCount, isError: linkCountFailed } = useGetLinkCount(org_id)
  const { data: quota, isError: quotaFailed } = useArtifactQuota(org_id)

  const parts: string[] = []

  if (linkCount) {
    parts.push(t('touchpoint:merged_list.quota.links', { count: linkCount.link_count }))
  } else if (linkCountFailed) {
    parts.push(t('touchpoint:merged_list.quota.links_unknown'))
  }

  if (quota) {
    parts.push(
      t('touchpoint:merged_list.quota.artifacts', {
        used: quota.live_count,
        total: quota.live_quota,
      })
    )
    parts.push(
      t('touchpoint:merged_list.quota.storage', {
        used: formatBytes(quota.used_bytes),
        total: formatBytes(quota.quota_bytes),
      })
    )
  } else if (quotaFailed) {
    parts.push(t('touchpoint:merged_list.quota.artifacts_unknown'))
    parts.push(t('touchpoint:merged_list.quota.storage_unknown'))
  }

  if (!parts.length) return null

  return (
    <span data-testid="merged-quota-meta" className="text-xs text-slate-500 whitespace-nowrap">
      {parts.join(' · ')}
    </span>
  )
}
