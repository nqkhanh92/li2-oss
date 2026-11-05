'use client'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Dải "Trợ lý Li2 — sắp có", cao 48px, theo phương án dự phòng §5.3 của `docs/v2-ux-spec.md`.
 *
 * KHÔNG phải cái dock của mockup. Dock đó cao `min(720px, 70vh)`; ở 1440×980 nó để lại 2,5 hàng
 * danh sách. Một khối chết chiếm 70% màn hình không phải giữ chỗ, là lấy mất trang.
 *
 * Ba thứ CỐ Ý không có trong DOM, chứ không phải có mà `disabled`: ô nhập, nút gửi, nút đính kèm.
 * Một ô nhập trông bấm được mà gõ vào không có gì xảy ra thì tệ hơn là không có ô nào — người ta
 * sẽ bấm, gõ, rồi tưởng sản phẩm hỏng. Lý lẽ đó dẫn tới *không render*, không dẫn tới `disabled`.
 *
 * Câu mô tả là **chữ thật**, không phải `placeholder` của một ô nhập giả.
 *
 * Màu: chữ xám nhạt trên nền thẻ, KHÔNG dùng nền xám đậm — một khối xám không rõ lý do đọc ra là
 * "hỏng".
 *
 * Không chừa thêm chỗ cho bản sau: dock bản sau cao 150–720px, chừa 48px cũng không tránh được
 * nhảy bố cục, chỉ mất 48px miễn phí ngay hôm nay.
 *
 * ⚠ Bề mặt chat THẬT đã tồn tại và không liên quan tới dải này: `src/features/agent-chat/`, mở
 * bằng nút trên navbar, bọc sau cờ `disabledFeatures.AI_CHAT`. Trên LiHi cờ đang tắt nên nút không
 * render. Dải này chỉ là lời báo, không phải bề mặt thứ hai.
 */
export const AssistantStrip = () => {
  const { t } = useTranslation(['touchpoint'])

  return (
    <section
      data-testid="assistant-strip"
      aria-label={`${t('touchpoint:merged_list.assistant.title')} — ${t('touchpoint:merged_list.assistant.coming_soon')}`}
      className="mt-2 flex h-12 items-center gap-2 rounded-[10px] border border-slate-200 bg-card px-4"
    >
      <Sparkles className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span className="text-s font-medium text-slate-600">
        {t('touchpoint:merged_list.assistant.title')}
      </span>
      <span className="truncate text-xs text-slate-500">
        {t('touchpoint:merged_list.assistant.hint')}
      </span>
      <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
        {t('touchpoint:merged_list.assistant.coming_soon')}
      </span>
    </section>
  )
}
