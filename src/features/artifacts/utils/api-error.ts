/**
 * Đọc `i18nMessage` mà backend đính kèm mọi lỗi (`BaseError.toResponse()`:
 * `{ error, message, i18nMessage }`).
 *
 * Vì sao cần ở đây thay vì chỉ nuốt lỗi và hiện một câu chung: hai trần quota của artifact
 * cạn **cùng lúc** (spec §6 — 30MB / 10MB mỗi file = 3, đúng bằng 3 artifact live), và hai
 * trục đó đòi hai hành động khác hẳn nhau — xoá bớt artifact, hay chọn file nhỏ hơn. Một câu
 * "đã hết hạn mức" không nói được cái nào, nên người dùng sẽ làm sai một nửa số lần. Khoá và
 * params của backend đã mang sẵn thông tin đó (`label.storage` vs `label.artifact`,
 * kèm `limit`); việc của FE là hiện nó ra chứ không đè lên bằng câu của mình.
 */
export type ArtifactApiI18n = { key: string; params?: Record<string, unknown> }

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null

/**
 * Không dùng `instanceof AxiosError`: lỗi đi qua TanStack Query có thể là bất cứ thứ gì, và một
 * `instanceof` sai chỗ thì im lặng trả `null` — tức là lại rơi về câu chung. Đọc theo hình dạng.
 */
export function artifactApiI18n(error: unknown): ArtifactApiI18n | null {
  const data = asRecord(asRecord(asRecord(error)?.response)?.data)
  const message = asRecord(data?.i18nMessage)
  if (!message || typeof message.key !== 'string') return null
  return { key: message.key, params: asRecord(message.params) ?? undefined }
}

/** HTTP status của lỗi, nếu đọc được — quota là 403, và 403 là trục duy nhất FE xử lý khác. */
export function artifactApiStatus(error: unknown): number | null {
  const status = asRecord(asRecord(error)?.response)?.status
  return typeof status === 'number' ? status : null
}
