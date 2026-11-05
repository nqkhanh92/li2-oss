'use client'

import { useState } from 'react'
import {
  File as FileIcon,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Globe,
  Link as LinkIcon,
  Presentation,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import {
  getRowAvatarClass,
  type RowKind,
  type RowKindIcon,
} from '@/features/short-links/utils/row-kind'

/**
 * Ô tròn đầu mỗi hàng, thay cho ô QR 90×90 cũ.
 *
 * Vì sao thay: QR ở đầu hàng chiếm chỗ nhất mà nói ít nhất — mọi hàng đều có một, và không ô nào
 * phân biệt được hàng này với hàng kia. "Tải QR" vẫn nằm trong menu ⋮ (`short-link-list/index.tsx`
 * action `download_qr`), nên đây là đổi chỗ hiển thị, không gỡ tính năng.
 *
 * Hai loại hàng, **cùng một ô**: cùng hình tròn, cùng kích cỡ, khác thứ bên trong.
 * - LINK → favicon của trang đích, lấy qua `/api/favicon` của chính mình (lý do proxy: xem
 *   `favicon.service.ts`).
 * - ARTIFACT → biểu tượng theo loại nội dung.
 */

/**
 * Ánh xạ tên biểu tượng → component. `Record` **đủ khoá** của `RowKindIcon`, nên thêm một giá trị
 * vào union mà quên ở đây là lỗi biên dịch — đúng cái đã xảy ra với `site` ở bảng kind (thiếu một
 * giá trị, lặng lẽ tụt về nhánh mặc định).
 */
const ICONS: Record<RowKindIcon, LucideIcon> = {
  link: LinkIcon,
  page: FileCode,
  site: Globe,
  pdf: FileText,
  slides: Presentation,
  document: FileType,
  sheet: FileSpreadsheet,
  image: FileImage,
  video: FileVideo,
  file: FileIcon,
}

interface RowAvatarProps {
  kind: RowKind
  /** URL trang đích — chỉ dùng cho hàng LINK. Artifact không trỏ đi đâu nên không có. */
  destinationUrl?: string | null
  className?: string
}

export const RowAvatar = ({ kind, destinationUrl, className }: RowAvatarProps) => {
  const [imageFailed, setImageFailed] = useState(false)

  const Icon = ICONS[kind.icon]
  const showFavicon = kind.family === 'url' && !!destinationUrl && !imageFailed

  return (
    <div
      data-testid="row-avatar"
      /**
       * Hiện ở **mọi** bề rộng. Ô QR cũ có `hidden md:flex` vì nó 90×90 — chiếm gần nửa bề ngang
       * một màn hình điện thoại. Ô này 44px, nên lý do ẩn đã hết; và trên mobile nó là **dấu hiệu
       * duy nhất** phân biệt link với artifact ngoài ô chữ nhỏ cạnh tên.
       */
      className={cn(
        'flex shrink-0 size-11 rounded-full items-center justify-center overflow-hidden',
        getRowAvatarClass(kind),
        className
      )}
    >
      {showFavicon ? (
        /**
         * `<img>` thuần, không `next/image`: đây là ảnh 16–64px đi qua route của mình, đã có
         * `Cache-Control`, nên tối ưu hoá của `next/image` không thêm gì — còn việc khai nó vào
         * `remotePatterns` thì vô nghĩa vì nguồn là origin của chính mình.
         *
         * ⚠ Hai đường thất bại, **phải bắt cả hai**: `onError` cho lỗi mạng/404, và `onLoad` với
         * `naturalWidth === 0` cho ca route trả **204 No Content** (không có favicon). Chỉ bắt
         * `onError` thì ca 204 để lại một ô trống — tức trông như tính năng hỏng, đúng rủi ro đã
         * ghi trong intend.md.
         */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/favicon?url=${encodeURIComponent(destinationUrl)}`}
          alt=""
          className="size-5 object-contain"
          loading="lazy"
          onError={() => setImageFailed(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth === 0) setImageFailed(true)
          }}
        />
      ) : (
        <Icon data-testid="row-avatar-icon" className="size-5" aria-hidden />
      )}
    </div>
  )
}
