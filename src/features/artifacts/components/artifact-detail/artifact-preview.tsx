'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, SquareArrowOutUpRight } from 'lucide-react'

import {
  ARTIFACT_KIND_SPECS,
  isArtifactUploadKind,
  type ArtifactDTO,
  type ArtifactServeMode,
} from '@/core/types/artifact.type'
import { Button } from '@/shared/components/ui/button'

import { getArtifactKindView } from '../../utils/artifact-kind'

/**
 * Office viewer nằm ở origin của Microsoft: iframe cross-origin không báo được thành công hay
 * thất bại về cho ta, nên "đợi rồi mới kết luận" là lời hứa không giữ được. Skeleton tắt khi
 * `onLoad` bắn hoặc sau ngần này, cái nào tới trước — sau đó không khẳng định gì nữa, và nút
 * Tải về vẫn nằm đó từ đầu (spec §4.3 ràng buộc 5).
 */
const OFFICE_SKELETON_TIMEOUT_MS = 8000

/**
 * Nút mở tab mới và tải về **hiện sẵn cho mọi kind**, không phải fallback bật lên khi xem trước
 * hỏng. Lý do: trình duyệt không cho ta biết một iframe cross-document render được hay không, nên
 * "phát hiện lỗi rồi mới hiện nút" là thứ ta không làm được. Thà thừa một nút còn hơn một khung
 * trắng không lối thoát.
 */
const PreviewActions = ({ artifact }: { artifact: ArtifactDTO }) => {
  const { t } = useTranslation('artifact')

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="secondary" size="sm">
        <a href={artifact.serve_url} target="_blank" rel="noreferrer noopener">
          <SquareArrowOutUpRight />
          {t('actions.open_new_tab')}
        </a>
      </Button>
      {artifact.download_url && (
        <Button asChild variant="secondary" size="sm">
          {/* `download_url` do server ghép — FE không tự nối `${serve_url}/download` */}
          <a href={artifact.download_url}>
            <Download />
            {t('actions.download')}
          </a>
        </Button>
      )}
    </div>
  )
}

/**
 * `sandbox` đặt cho **đúng một** kind: `html`. Cờ đó lấy thẳng từ
 * `ARTIFACT_KIND_SPECS[kind].sandboxed` chứ không suy lại ở đây — nó là cùng một quyết định mà
 * server dùng để dựng CSP, và hai phía suy riêng là cách lỗi ranh giới sinh ra.
 *
 * Vì sao `pdf` KHÔNG sandbox dù byte cũng là của người dùng: attribute thiếu `allow-same-origin`
 * bật đúng cờ *sandboxed plugins* mà directive `sandbox` trong CSP bật, nên trình xem PDF nội bộ
 * bị chặn và khung trắng — trong khi mở đúng URL đó ở tab mới thì chạy. Và một response
 * `application/pdf` không tạo ra document HTML nào để sandbox bảo vệ, nên cái giá đó đổi lấy số
 * không. Với `slides`/`video`, trang trong iframe là landing của chính li2: sandbox đặt nó vào
 * origin mờ và giết `frame-src` của Office viewer lẫn `media-src 'self'` của video.
 *
 * Với `html` thì ngược lại: markup do người lạ viết, chạy được, và việc KHÔNG có
 * `allow-same-origin` là thứ duy nhất chặn nó đọc cookie hay storage của dashboard. Đừng thêm
 * `allow-same-origin` dù preview có lỗi hiển thị.
 *
 * `serve_url` do server ghép sẵn — không dựng từ `window.location.origin`, vì origin phục vụ tách
 * khỏi origin dashboard.
 */
const PreviewFrame = ({
  artifact,
  serveMode,
  sandboxed,
}: {
  artifact: ArtifactDTO
  serveMode: ArtifactServeMode
  sandboxed: boolean
}) => {
  const { t } = useTranslation('artifact')
  const [isOfficeLoading, setIsOfficeLoading] = useState(serveMode === 'office-viewer')

  useEffect(() => {
    if (!isOfficeLoading) return
    const timer = setTimeout(() => setIsOfficeLoading(false), OFFICE_SKELETON_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isOfficeLoading])

  return (
    <div className="relative rounded-[16px] border border-slate-200 overflow-hidden bg-white">
      <iframe
        src={artifact.preview_url ?? artifact.serve_url}
        title={t('detail.preview_label')}
        sandbox={sandboxed ? 'allow-scripts' : undefined}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setIsOfficeLoading(false)}
        className="w-full h-[420px] border-0"
      />
      {isOfficeLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <p className="text-s text-slate-500">{t('detail.office_viewer_loading')}</p>
        </div>
      )}
    </div>
  )
}

export const ArtifactPreview = ({
  artifact,
  hideLabel,
}: {
  artifact: ArtifactDTO
  /**
   * Trang chi tiết một trang cuộn đã có tiêu đề khối "Xem trước nội dung" ở `ArtifactSection`, nên
   * nhãn bên trong là nhãn thứ hai cho cùng một khối. Mặc định vẫn hiện để chỗ gọi cũ không đổi.
   */
  hideLabel?: boolean
}) => {
  const { t } = useTranslation('artifact')
  const { Icon } = getArtifactKindView(artifact.kind)

  // Route phục vụ trả 404 với artifact chưa live, nên không nhúng iframe chết.
  if (artifact.status !== 'live') {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
        <Icon className="w-7 h-7 text-slate-300" />
        <p className="text-s text-slate-500">{t('detail.preview_unavailable')}</p>
      </div>
    )
  }

  /**
   * `kind` của DTO là `ArtifactKind` (6 giá trị của CHECK), rộng hơn tập upload được hôm nay.
   * Một hàng `markdown`/`site` — di sản hay sửa tay trong DB — không có `serveMode` nào, nên thay
   * vì đọc `undefined.serveMode` và vỡ cả trang chi tiết, hiện khối tải về.
   */
  if (!isArtifactUploadKind(artifact.kind)) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-s font-medium text-slate-600">{t('detail.preview_label')}</p>
        <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
          <Icon className="w-7 h-7 text-slate-300" />
          <p className="text-s text-slate-500">{t('detail.preview.download_to_view')}</p>
          <PreviewActions artifact={artifact} />
        </div>
      </div>
    )
  }

  const { serveMode, sandboxed } = ARTIFACT_KIND_SPECS[artifact.kind]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hideLabel ? (
          <span />
        ) : (
          <p className="text-s font-medium text-slate-600">{t('detail.preview_label')}</p>
        )}
        <PreviewActions artifact={artifact} />
      </div>

      <PreviewFrame artifact={artifact} serveMode={serveMode} sandboxed={sandboxed} />

      {serveMode === 'inline-binary' && (
        <p className="text-xs text-slate-500">{t('detail.preview.open_direct')}</p>
      )}
      {/**
       * Quyền riêng tư nói ngay dưới khung, không giấu trong tooltip: byte đã rời khỏi li2 rồi
       * thì nói sau là vô nghĩa (spec §7 rủi ro 1).
       */}
      {serveMode === 'office-viewer' && (
        <p className="text-xs text-slate-500">{t('detail.office_viewer_privacy')}</p>
      )}

      <p className="text-xs text-slate-500">{t('detail.responsibility')}</p>
    </div>
  )
}
