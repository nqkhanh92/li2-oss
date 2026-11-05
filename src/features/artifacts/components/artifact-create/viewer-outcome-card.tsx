'use client'

import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'

import type { ArtifactAccessMode } from '@/core/types/artifact.type'

import { getArtifactAccessView } from '../../utils/artifact-access'

/**
 * Khoá viết đủ, không ghép `` `artifact:create.viewer.${mode}.headline` `` — khoá ghép thì
 * `i18n-keys.test.ts` không nhìn thấy, và khoá thiếu ở artifact không hề gãy: i18next trả lại
 * chính chuỗi khoá.
 */
const VIEWER_COPY: Record<ArtifactAccessMode, { headlineKey: string; bodyKey: string }> = {
  public: {
    headlineKey: 'artifact:create.viewer.public.headline',
    bodyKey: 'artifact:create.viewer.public.body',
  },
  password: {
    headlineKey: 'artifact:create.viewer.password.headline',
    bodyKey: 'artifact:create.viewer.password.body',
  },
  google: {
    headlineKey: 'artifact:create.viewer.google.headline',
    bodyKey: 'artifact:create.viewer.google.body',
  },
  private: {
    headlineKey: 'artifact:create.viewer.private.headline',
    bodyKey: 'artifact:create.viewer.private.body',
  },
}

/**
 * ⭐ Cột phải đổi theo chế độ đang chọn (mockup §3).
 *
 * Đây là thứ duy nhất trong trang này không phải sắp xếp lại: nó nói cho người tạo biết **người
 * xem sẽ gặp gì**, ngay lúc họ còn đang chọn. Và với `public` nó nói thẳng cái giá — đo trên LiHi
 * 28/32 artifact đang ở `public`, phần lớn không phải vì người dùng cân nhắc mà vì chưa ai nói cho
 * họ biết đánh đổi là gì.
 *
 * Ô vàng CHỈ hiện ở `public`: ba chế độ còn lại đều nhận được danh tính người xem ở mức nào đó,
 * nên cảnh báo ở đó là báo động giả.
 */
export const ViewerOutcomeCard = ({ mode }: { mode: ArtifactAccessMode }) => {
  const { t } = useTranslation(['artifact'])
  const { Icon } = getArtifactAccessView(mode)
  const copy = VIEWER_COPY[mode] ?? VIEWER_COPY.private

  return (
    <div className="flex w-full flex-col gap-2" data-testid="viewer-outcome" data-mode={mode}>
      <span className="text-s font-medium text-slate-700">{t('artifact:create.viewer.title')}</span>

      <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-4 text-center">
        <Icon className="size-6 text-slate-400" aria-hidden="true" />
        <p className="text-s font-medium text-foreground">{t(copy.headlineKey)}</p>
        <p className="text-xs text-slate-500">{t(copy.bodyKey)}</p>
      </div>

      {mode === 'public' && (
        <p
          data-testid="viewer-outcome-warning"
          className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800"
        >
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{t('artifact:create.viewer.public.warning')}</span>
        </p>
      )}
    </div>
  )
}
