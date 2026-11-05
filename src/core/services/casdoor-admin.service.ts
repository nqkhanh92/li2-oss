import 'server-only'

import { queryCasdoor } from '@/infrastructure/database/casdoor/pool'

/**
 * Người này có phải quản trị viên Casdoor không.
 *
 * Tra theo `id` TRƯỚC, `email` chỉ là đường lùi: trên LiHi đã từng có **hai tài khoản Casdoor
 * trùng email**, nên email không phải khoá duy nhất và tra theo nó có thể bắt nhầm người. `id`
 * trong token (`payload.id`) khớp cột `id` của bảng `user`.
 *
 * `"user"` phải để trong nháy kép — `user` là từ khoá SQL.
 */
export const isCasdoorAdmin = async (userId?: string, email?: string): Promise<boolean> => {
  if (userId) {
    const byId = await queryCasdoor<{ is_admin: boolean }>(
      'select is_admin from "user" where id = $1 limit 1',
      [userId]
    )
    if (byId.length > 0) return byId[0].is_admin === true
  }

  if (!email) return false

  /**
   * Chỉ nhận email khi nó trỏ tới **đúng một** hàng. Có hai hàng trùng email thì không biết hàng
   * nào là người đang gọi — và đoán ở một cổng quyền là cách cấp quyền cho nhầm người.
   */
  const byEmail = await queryCasdoor<{ is_admin: boolean }>(
    'select is_admin from "user" where email = $1 limit 2',
    [email]
  )
  if (byEmail.length !== 1) return false
  return byEmail[0].is_admin === true
}
