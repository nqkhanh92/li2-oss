import { slugMaxLength, slugMinLength, slugSchema } from '@/shared/schemas/slug'
import { ACCEPTED_ARTIFACT_EXTENSIONS } from '@/core/types/artifact.type'

/**
 * Danh sách đuôi file và chuỗi `accept` sống ở `@/core/types/artifact.type`, dẫn xuất từ
 * `ARTIFACT_FORMATS` — cùng một mảng mà backend dùng để chọn MIME và để sniff. Ở đây chỉ
 * re-export, giống lối `SLUG_MAX_LENGTH` bên dưới.
 *
 * Bản chép cũ ở file này là `['.html', '.htm']`. Giữ nó lại sau khi backend mở sang 8 đuôi
 * nghĩa là người dùng không chọn nổi file `.pdf` ở ô chọn file trong khi server sẵn sàng
 * nhận — hai cổng nói hai chuyện, đúng lớp lỗi `SLUG_MAX_LENGTH` 60 vs 64.
 */
export {
  ACCEPTED_ARTIFACT_EXTENSIONS,
  ARTIFACT_FILE_ACCEPT,
  ARTIFACT_MAX_BYTES,
  artifactFormatForFileName,
  artifactKindForFileName,
} from '@/core/types/artifact.type'

/**
 * Slug đi thẳng vào `slugSchema` của touch-point lúc publish, nên mọi giới hạn phải lấy
 * từ đó chứ không chép lại. Bản chép cũ ở đây là 60 trong khi backend là 64, và không có
 * min — tên file ngắn như `menu.html` sinh slug 4 ký tự, upload xong thì publish ném
 * ZodError 500 và artifact kẹt `draft`.
 */
export {
  slugMaxLength as SLUG_MAX_LENGTH,
  slugMinLength as SLUG_MIN_LENGTH,
} from '@/shared/schemas/slug'

function stripDiacritics(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
}

export function hasAcceptedExtension(fileName: string) {
  const lower = fileName.toLowerCase()
  return ACCEPTED_ARTIFACT_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/** Tên file bỏ đuôi — dùng điền sẵn ô tên, giống mặc định của backend. */
export function fileNameWithoutExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '')
}

/**
 * Bỏ dấu tiếng Việt rồi rút về [a-z0-9-] để slug khớp được với URL đã in trên QR.
 *
 * **Cắt TRƯỚC, bỏ gạch SAU.** Thứ tự ngược lại (bỏ gạch rồi `.slice`) đúng cho mọi tên ngắn và
 * hỏng im lặng cho tên dài: cắt ở ký tự thứ `slugMaxLength` có thể rơi đúng vào một dấu gạch,
 * và slug kết thúc bằng `-` bị `slugSchema` từ chối. Hệ quả người dùng thấy là ô đường dẫn để
 * trống không lý do với những file tên dài — mà tên dài chính là chuyện thường ngày với PDF và
 * video, đúng nhóm wave này vừa mở cửa cho.
 */
export function slugifyFileName(fileName: string) {
  return stripDiacritics(fileNameWithoutExtension(fileName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, slugMaxLength)
    .replace(/^-+|-+$/g, '')
}

/**
 * Dùng khi người dùng đang gõ: KHÔNG cắt dấu gạch ở cuối, nếu không họ sẽ không
 * bao giờ gõ được ký tự sau dấu gạch.
 */
export function normalizeSlugInput(value: string) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, slugMaxLength)
}

/**
 * Slug có hợp lệ với backend không. Dùng để (a) chỉ điền sẵn khi slug tự sinh dùng được,
 * (b) chặn submit kèm thông báo ngay tại ô, thay vì để publish trả 500.
 */
export function isValidSlug(value: string) {
  return slugSchema.safeParse(value).success
}

/** Slug tự sinh chỉ được điền sẵn khi nó thật sự publish được; nếu không, để trống và
 * backend tự sinh — tốt hơn là đưa người dùng một giá trị chắc chắn hỏng. */
export function suggestedSlug(fileName: string) {
  const slug = slugifyFileName(fileName)
  return isValidSlug(slug) ? slug : ''
}

/**
 * Bảng chữ cái cho slug ngẫu nhiên. Bỏ `l`, `o` và chữ số `0`, `1` vì người dùng phải ĐỌC
 * slug này qua điện thoại hoặc chép tay từ tờ rơi — `l` với `1` và `o` với `0` nhìn gần
 * giống nhau ở phần lớn phông chữ.
 */
const RANDOM_SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const RANDOM_SLUG_LENGTH = 10

/**
 * Slug ngẫu nhiên điền sẵn lúc tạo artifact, để người dùng xuất bản ngay mà không phải
 * nghĩ ra đường dẫn. Họ sửa lại được bất cứ lúc nào trước khi bấm.
 *
 * Dùng `crypto.getRandomValues` chứ không `Math.random`: đường dẫn này là thứ duy nhất
 * đứng giữa một artifact công khai và người lạ, nên nó không được đoán ra từ các slug đã
 * sinh trước đó. 32^10 ≈ 1,1×10^15 tổ hợp.
 */
export function randomSlug() {
  const alphabet = RANDOM_SLUG_ALPHABET
  const bytes = new Uint8Array(RANDOM_SLUG_LENGTH)
  globalThis.crypto.getRandomValues(bytes)
  // Lấy dư trên 256 lệch nhẹ về các ký tự đầu bảng; với 32 ký tự thì 256 chia hết cho 32
  // nên phép lấy dư ở đây phân bố đều.
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

export { slugMinLength, slugMaxLength }
