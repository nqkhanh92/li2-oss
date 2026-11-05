'use client'

import { TagsList } from '@/features/tags/components/tags-list'

/**
 * QUẢN LÝ tag (tạo / sửa / xoá tag của tổ chức) — chuyển về đây từ mục Tags ở sidebar chính,
 * đặt dưới Link Cloaking; chủ sản phẩm 2026-10-23.
 *
 * Khác với trường gán tag cho link: trường đó vẫn nằm ở tab Basic settings.
 *
 * `blocked` để false vì trang `/tags` chặn theo `MAX_TAGS_PER_ORG`, mà kiểm đó chạy ở server
 * component. Ở đây đã nằm trong form của một org có quyền tạo link, nên gate lại không thêm gì.
 */
export const ShortLinkTagsSection = () => {
  return <TagsList blocked={false} />
}
