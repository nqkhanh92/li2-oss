import { TouchPointArtifactMeta } from '../types/touch-point.type'

/**
 * Chuẩn hoá phần `artifacts` mà PostgREST nhúng vào mỗi hàng touch point.
 *
 * `artifacts.touch_point_id` có UNIQUE index (`artifacts_touch_point_id_key`), nên PostgREST
 * *thường* nhận ra quan hệ một-một và trả về một đối tượng. Nhưng "thường" không phải "luôn":
 * việc nhận diện đó phụ thuộc vào thông tin lược đồ PostgREST nạp được lúc khởi động, và cùng một
 * câu truy vấn có thể trả về mảng sau một lần reload schema cache. Danh sách gộp mà vỡ vì chuyện
 * đó thì sẽ vỡ im lặng — mọi artifact bỗng hiện như link thường, không có lỗi nào được ném ra.
 *
 * Nên ở đây nhận cả hai hình dạng và luôn trả về một hình dạng.
 *
 * Mảng rỗng → `null`: touch point có thật nhưng không artifact nào trỏ tới (artifact đã bị xoá —
 * FK là `ON DELETE SET NULL`).
 */
export function normalizeArtifactEmbed(embedded: unknown): TouchPointArtifactMeta | null {
  if (!embedded) return null
  if (Array.isArray(embedded)) {
    return (embedded[0] as TouchPointArtifactMeta | undefined) ?? null
  }
  return embedded as TouchPointArtifactMeta
}

/**
 * Gắn `artifact` đã chuẩn hoá vào từng hàng và bỏ khoá `artifacts` thô đi.
 *
 * Bỏ khoá thô là có chủ đích: để lại cả hai thì nơi gọi có hai nguồn cho cùng một sự thật, và
 * nguồn sai lại chính là nguồn có tên dễ gõ hơn.
 */
export function attachArtifactMeta<T extends Record<string, any>>(rows: T[]) {
  return rows.map((row) => {
    const { artifacts, ...rest } = row
    return { ...rest, artifact: normalizeArtifactEmbed(artifacts) }
  })
}
