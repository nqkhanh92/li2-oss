'use client'

import { useTranslation } from 'react-i18next'

import { useArtifactQuota } from '../../hooks/use-artifacts'
import { formatBytes } from '../../utils/format-bytes'

/**
 * Hạn mức ở mép phải thanh tiêu đề của trang tạo (mockup §4). Tự gọi `useArtifactQuota` thay vì
 * nhận qua prop: nó chỉ sống ở thanh tiêu đề, và để `ArtifactCreate` không phải gọi một query mà
 * phần còn lại của trang không dùng.
 *
 * Chưa có số thì KHÔNG hiện chỗ giữ: một dòng "–/– artifact" nhấp nháy rồi đổi số còn khó đọc hơn
 * là xuất hiện muộn nửa giây.
 */
export const ArtifactCreateQuotaNote = ({ orgId }: { orgId: string }) => {
  const { t } = useTranslation(['artifact'])
  const { data: quota } = useArtifactQuota(orgId)

  if (!quota) return null

  return (
    <span className="text-xs font-normal text-slate-500">
      {t('artifact:create.quota_note', {
        live: quota.live_count,
        liveQuota: quota.live_quota,
        used: formatBytes(quota.used_bytes),
        quota: formatBytes(quota.quota_bytes),
      })}
    </span>
  )
}
