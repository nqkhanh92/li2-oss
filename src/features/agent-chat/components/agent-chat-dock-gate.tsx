'use client'

/**
 * Quyết định dock chat có hiện hay không, và chừa chỗ cho nó.
 *
 * ★ CHỈ TRÊN TRANG LINK & ARTIFACT — chủ sản phẩm chốt 2026-10-29 (mục 7): *"hiện tại chat chỉ
 * hiện trên trang link&artifact"*. Trước đó panel được nhúng trong layout org nên có mặt ở MỌI
 * trang con, kể cả Analytics và Settings.
 *
 * Giới hạn ở đây chứ không ở `layout.tsx` vì layout là server component và không đọc được đường
 * dẫn hiện tại. Và giới hạn ở MỘT chỗ chứ không nhúng panel vào từng `page.tsx`: nhúng theo trang
 * thì panel bị tháo và dựng lại mỗi lần chuyển trang, mất sạch hội thoại đang dở — trong khi
 * `AgentChatProvider` vẫn sống ở layout nên trạng thái đáng lẽ phải còn.
 *
 * ⚠️ Dock là `position: fixed` nên nó KHÔNG chiếm chỗ trong dòng chảy và sẽ che phần cuối vùng
 * cuộn. Không có cách nào để nó tự đẩy nội dung lên, nên nó khai chiều cao của mình qua một biến
 * CSS và vùng nội dung đọc biến đó. Chỉ chừa chỗ cho trạng thái THU GỌN: lúc mở, dock che nội
 * dung là đúng ý — người dùng đang đọc hội thoại chứ không đọc bảng.
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AgentChatPanel } from './agent-chat-panel'
import { isLinkArtifactPage } from '../utils/dock-visibility'

/**
 * ⚠️ Chiều cao lúc thu gọn KHÔNG còn là hằng số ở đây.
 *
 * Trước đây con số được chép tay vào hai chỗ (`150` ở đây và `h-[150px]` trong panel) kèm lời dặn
 * "phải khớp". Lần sửa 2026-11-02 bỏ một hàng khỏi dock, và con số chép tay thành sai ngay —
 * ô gõ bị cắt mất một phần, chủ sản phẩm báo: *"khi collapse chỗ gõ nó bị thể hiện không đầy đủ"*.
 *
 * Nên giờ **panel tự đo mình** và tự đặt `--agent-dock-height`. Thêm hay bớt một hàng trong dock
 * không còn chỗ thứ hai phải nhớ sửa, và không ai phải đoán đúng con số nữa.
 */
export function AgentChatDockGate() {
  const pathname = usePathname()
  const show = isLinkArtifactPage(pathname)

  // Dọn biến khi rời trang có dock. Panel đặt nó, nhưng panel bị tháo trước khi kịp dọn.
  useEffect(() => {
    if (show) return
    document.documentElement.style.removeProperty('--agent-dock-height')
  }, [show])

  if (!show) return null
  return <AgentChatPanel />
}
