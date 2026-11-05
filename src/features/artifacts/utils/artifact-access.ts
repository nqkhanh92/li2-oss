import { Globe, KeyRound, Lock, Mail } from 'lucide-react'

import {
  ARTIFACT_PASSWORD_MIN_LENGTH,
  isArtifactAccessMode,
  type ArtifactAccessMode,
} from '@/core/types/artifact.type'

/**
 * Icon + khoá nhãn/mô tả cho từng chế độ xem, ở MỘT chỗ — hộp thoại tạo, hộp thoại đổi, badge thẻ và
 * khối Quyền xem ở trang chi tiết đều đọc bảng này. Khoá viết đủ `artifact:` để `i18n-keys.test.ts`
 * nhìn thấy (cùng lý do với `artifact-kind.ts`).
 */
const ACCESS_VIEWS: Record<
  ArtifactAccessMode,
  { Icon: React.ElementType; labelKey: string; descriptionKey: string }
> = {
  public: {
    Icon: Globe,
    labelKey: 'artifact:access.mode.public.label',
    descriptionKey: 'artifact:access.mode.public.description',
  },
  private: {
    Icon: Lock,
    labelKey: 'artifact:access.mode.private.label',
    descriptionKey: 'artifact:access.mode.private.description',
  },
  password: {
    Icon: KeyRound,
    labelKey: 'artifact:access.mode.password.label',
    descriptionKey: 'artifact:access.mode.password.description',
  },
  google: {
    Icon: Mail,
    labelKey: 'artifact:access.mode.google.label',
    descriptionKey: 'artifact:access.mode.google.description',
  },
}

/**
 * `ArtifactDTO.access_mode` rộng hơn union (cột là `string`), nên giá trị lạ rơi về hình của `private`
 * — ĐÓNG, cùng hướng với `artifact-serve.service.ts` coi giá trị lạ là private. Nhãn vẫn là chuỗi thô
 * để người đọc thấy đúng thứ DB đang giữ.
 */
export function getArtifactAccessView(mode: ArtifactAccessMode | (string & {})) {
  if (isArtifactAccessMode(mode)) return ACCESS_VIEWS[mode]
  return { ...ACCESS_VIEWS.private, labelKey: '' }
}

/**
 * Tạo ngẫu nhiên: 16 ký tự `[a-z0-9]` bằng `crypto.getRandomValues` — KHÔNG `Math.random`, KHÔNG
 * `setTimeout(700)` giả bận như `password-section.tsx` của short-link (spec M2.1). Rejection sampling
 * (bỏ byte ≥ 252) để 36 ký tự được chọn đều nhau.
 */
export function generateArtifactPassword(length = 16): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const limit = 256 - (256 % alphabet.length) // 252
  let out = ''
  const bytes = new Uint8Array(length * 2)
  while (out.length < length) {
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      if (byte >= limit) continue
      out += alphabet[byte % alphabet.length]
      if (out.length === length) break
    }
  }
  return out
}

/** Cùng phép đếm với server (`[...s].length` sau trim). */
export const isArtifactPasswordLongEnough = (value: string) =>
  [...value.trim()].length >= ARTIFACT_PASSWORD_MIN_LENGTH
