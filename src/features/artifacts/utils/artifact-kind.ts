import {
  FileCode2,
  FileImage,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileVideo,
  Presentation,
} from 'lucide-react'

import {
  isArtifactUploadKind,
  type ArtifactKind,
  type ArtifactUploadKind,
} from '@/core/types/artifact.type'

/**
 * Icon và khoá nhãn cho từng kind, ở MỘT chỗ.
 *
 * Khoá viết đủ `artifact:` chứ không dựa vào namespace mặc định của nơi gọi: `i18n-keys.test.ts`
 * chỉ nhận ra khoá có tiền tố namespace trong literal, nên bỏ tiền tố là tự đưa năm khoá này ra
 * ngoài tầm kiểm — đúng loại khoá thiếu mà test đó sinh ra để bắt.
 *
 * Ba nơi hiển thị kind — ô chọn file, thẻ trong danh sách, trang chi tiết — phải nói cùng một
 * thứ về cùng một file. Tách ra ba `switch` thì lần thêm kind tiếp theo sẽ sửa được hai và
 * quên một, và chỗ quên không có gì báo.
 */
const KIND_VIEWS: Record<ArtifactUploadKind, { Icon: React.ElementType; labelKey: string }> = {
  html: { Icon: FileCode2, labelKey: 'artifact:kind.html' },
  markdown: { Icon: FileType2, labelKey: 'artifact:kind.markdown' },
  pdf: { Icon: FileText, labelKey: 'artifact:kind.pdf' },
  slides: { Icon: Presentation, labelKey: 'artifact:kind.slides' },
  document: { Icon: FileText, labelKey: 'artifact:kind.document' },
  sheet: { Icon: FileSpreadsheet, labelKey: 'artifact:kind.sheet' },
  image: { Icon: FileImage, labelKey: 'artifact:kind.image' },
  video: { Icon: FileVideo, labelKey: 'artifact:kind.video' },
}

/**
 * `ArtifactDTO.kind` là `ArtifactKind | (string & {})` (spec A6b), rộng hơn `ArtifactUploadKind`
 * (4 giá trị upload được hôm nay) theo hai bậc: `markdown`/`site` nằm trong CHECK để sau này khỏi
 * phải viết migration, và **bất cứ chuỗi nào** cũng tới được vì `database.types.ts` khai cột là
 * `string` còn `toDTO` giữ nguyên giá trị lạ thay vì ép về một giá trị hợp lệ.
 *
 * Cả hai bậc đều làm `KIND_VIEWS[kind]` trả `undefined` rồi vỡ cả trang danh sách, nên chặn bằng
 * type guard của core chứ không ép kiểu. Kiểu tham số rộng ở đây là cố ý: hẹp nó lại chỉ đẩy phép
 * ép kiểu sang nơi gọi, chỗ không có guard nào.
 */
export function getArtifactKindView(kind: ArtifactKind | (string & {})) {
  if (!isArtifactUploadKind(kind)) {
    return { Icon: FileQuestion, labelKey: 'artifact:kind.unknown' }
  }
  return KIND_VIEWS[kind]
}

/** Dùng cho ô chọn file: ở đó ta mới có tên file, chưa có artifact nào. */
export function getArtifactKindViewForUploadKind(kind: ArtifactUploadKind) {
  return KIND_VIEWS[kind]
}
