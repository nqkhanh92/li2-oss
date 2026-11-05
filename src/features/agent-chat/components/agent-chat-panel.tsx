'use client'

/**
 * Dock chat dán đáy trang — thay cho Sheet trượt bên phải.
 *
 * ★ VÌ SAO ĐỔI. Mockup `bihj82fbm3bzl8a8` vẽ một dock đáy, và lý do không chỉ là thẩm mỹ: Sheet
 * bên phải **che mất bảng Link & Artifact**, trong khi gần như mọi câu người dùng nói ở đây đều
 * nói VỀ bảng đó ("xoá link này", "link nào nhiều lượt nhất"). Dock đáy giữ bảng trong tầm mắt,
 * nên hàng vừa được tạo hiện lên ngay trước mặt họ thay vì sau một tấm che.
 *
 * Hai trạng thái: THU GỌN — cao vừa đủ hàng tiêu đề + ô soạn, tự đo chứ không ép số; và MỞ —
 * người dùng kéo được, mặc định `min(720px, 70vh)`, nhớ qua `localStorage`.
 *
 * ⚠️ Dock **che phần cuối trang** khi mở. Trang chủ động đệm thêm ở dưới (`.has-agent-dock`,
 * xem `globals.css`) chứ không để dock tự lo: một `position: fixed` không chiếm chỗ trong dòng
 * chảy, nên không có cách nào để nó tự đẩy nội dung lên.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Sparkles, Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import { Button } from '@/shared/components/ui/button'
import { useSidebar } from '@/shared/components/ui/sidebar'
import { cn } from '@/shared/lib/utils'
import { useDockResize } from '../hooks/use-dock-resize'
import { useAgentChatContext } from '@/shared/providers/agent-chat-provider'
import { MessageList } from './message-list'
import { AgentComposer, type AgentComposerHandle } from './agent-composer'
import { UsageMeter } from './usage-meter'

export function AgentChatPanel() {
  const { t } = useTranslation('agent-chat')
  const {
    isOpen,
    setIsOpen,
    messages,
    isStreaming,
    sendMessage,
    decide,
    newConversation,
    cancelTurn,
  } = useAgentChatContext()
  const composerRef = useRef<AgentComposerHandle>(null)

  // `state` chứ không `open`: hai giá trị này cùng nói một điều, nhưng `state` là thứ chính
  // `ui/sidebar.tsx` dùng để chọn bề rộng, nên đọc nó thì không lệch được.
  const { state: sidebarState, isMobile } = useSidebar()
  const sidebarWidth =
    sidebarState === 'collapsed' ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)'

  const resize = useDockResize(isOpen)

  /**
   * ⭐ Dock tự đo chiều cao lúc thu gọn và khai ra cho trang biết chừa chỗ.
   *
   * Trước đây con số được chép tay ở hai nơi kèm lời dặn "phải khớp". Lần sửa này bỏ một hàng
   * khỏi dock và con số thành sai ngay — ô gõ bị cắt. Đo thật thì thêm hay bớt hàng về sau đều
   * tự đúng.
   *
   * Chỉ đo khi THU GỌN, và giữ giá trị đó cả lúc mở: trang chỉ cần chừa chỗ cho trạng thái thu
   * gọn — lúc mở, dock che bảng là đúng ý, người dùng đang đọc hội thoại.
   */
  const sectionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = sectionRef.current
    if (!el || isOpen) return
    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height)
      if (h > 0) document.documentElement.style.setProperty('--agent-dock-height', `${h}px`)
    }
    publish()
    // Chiều cao đổi khi chip đính kèm hiện ra, khi ô gõ cao lên vì xuống dòng, khi đổi bề ngang.
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isOpen])

  /**
   * ⭐ Chạm vào ô gõ là MỞ dock.
   *
   * Chủ sản phẩm chốt 2026-11-02: *"khi bấm chat thì khung chat tự động bật reopen lên"*. Cùng
   * một lý do với việc mở lúc gửi — ô gõ hiện ở cả hai trạng thái, nên đặt con trỏ vào đó là
   * người dùng đã tuyên bố ý định dùng hội thoại. Bắt họ tìm thêm một nút nữa là thừa.
   */
  const handleComposerFocus = useCallback(() => setIsOpen(true), [setIsOpen])

  /**
   * ⭐ Gửi tin thì MỞ dock ra, không để người dùng gõ vào khoảng không.
   *
   * Lỗi đã có người dùng thật báo 2026-11-02: ô soạn hiện ở CẢ hai trạng thái, nhưng
   * `MessageList` chỉ render khi `isOpen`. Nên gõ lúc đang thu gọn thì câu hỏi đi, câu trả lời
   * về, mà màn hình không đổi gì — trợ lý trông như hỏng. Họ phải tự đoán ra là bấm
   * "Mở lại hội thoại".
   *
   * Mở ở đây chứ không ở provider: đây là chuyện của riêng cái dock này. Provider còn phục vụ
   * những bề mặt khác, và `isOpen` ở đó không nhất thiết nghĩa là "đang nhìn thấy tin nhắn".
   */
  const handleSend = useCallback(
    (text: string, file?: File | null) => {
      setIsOpen(true)
      sendMessage(text, file)
    },
    [setIsOpen, sendMessage]
  )

  const hasMessages = messages.length > 0

  return (
    <section
      ref={sectionRef}
      aria-label={t('title')}
      /**
       * ⭐ Mép trái bám theo sidebar, không bám mép trình duyệt.
       *
       * Chủ sản phẩm báo 2026-11-02: *"nó tràn màn hình bên dưới tôi thấy xấu"*. `inset-x-0` kéo
       * dock qua CẢ dải sidebar, nên nó trông như một thanh của trình duyệt chứ không như một
       * phần của trang Link & Artifact — mà nó chỉ sống ở trang đó.
       *
       * Dùng `--sidebar-width` / `--sidebar-width-icon` do `SidebarProvider` đặt
       * (`ui/sidebar.tsx:159`) thay vì số cứng: sidebar thu lại thì dock tự trượt theo, và ngày
       * ai đó đổi bề rộng sidebar thì không có chỗ thứ hai phải nhớ sửa.
       *
       * Trên mobile sidebar là lớp phủ, không chiếm chỗ — nên mép trái về 0.
       */
      style={{
        left: isMobile ? 0 : sidebarWidth,
        height: isOpen ? (resize.height ?? undefined) : undefined,
      }}
      className={cn(
        'fixed right-0 bottom-0 z-40 flex flex-col rounded-t-[22px] border-t border-slate-200 bg-white shadow-[0_-12px_32px_rgba(15,23,42,0.10)]',
        // Lúc ĐANG KÉO thì bỏ hiệu ứng: chiều cao đổi theo từng pixel con trỏ, mà một hiệu ứng
        // 200ms trên mỗi khung hình làm thanh kéo chạy trễ sau tay.
        !resize.isDragging && 'transition-[height,left] duration-200',
        // Chưa đọc được `localStorage` (khung hình đầu) thì dùng giá trị cũ, tránh nhảy chiều cao.
        isOpen && resize.height === null && 'h-[min(720px,70vh)]'
      )}
    >
      {/*
        Tay nắm kéo — chỉ khi dock đang mở. Lúc thu gọn, chiều cao do nội dung quyết định
        ("khung khoảng nhiêu đây thôi" — chủ sản phẩm), nên một tay nắm ở đó không có gì để kéo.
      */}
      {isOpen && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={t('dock.resize')}
          tabIndex={0}
          onPointerDown={resize.onPointerDown}
          onPointerMove={resize.onPointerMove}
          onPointerUp={resize.endDrag}
          onPointerCancel={resize.endDrag}
          onKeyDown={resize.onKeyDown}
          className="group absolute inset-x-0 top-0 z-10 flex h-4 cursor-ns-resize touch-none items-center justify-center rounded-t-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <span
            className={cn(
              'h-1 w-10 rounded-full bg-slate-200 transition-colors group-hover:bg-slate-400 group-focus-visible:bg-slate-400',
              resize.isDragging && 'bg-slate-500'
            )}
          />
        </div>
      )}
      <div className="mx-auto flex w-full max-w-[880px] min-h-0 flex-1 flex-col px-4 sm:px-6">
        <header className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-slate-900 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="shrink-0 text-[15px] font-semibold text-slate-900">{t('title')}</span>
            {/*
              `dock.hint` ("create links, publish files, ask about numbers") đã GỠ 2026-11-02 —
              chủ sản phẩm chốt một hàng: tên bên trái, nút bên phải, không có gì ở giữa. Câu đó
              lặp lại thứ ba chip gợi ý ngay bên dưới đã nói, bằng chữ nhỏ hơn và không bấm được.
              Khoá i18n giữ lại, chưa xoá.
            */}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {hasMessages && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="xs" variant="tertiary" iconLeft={<Plus />} disabled={isStreaming}>
                    {t('newChat')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('newChatConfirm.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('newChatConfirm.description')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('newChatConfirm.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={newConversation}>
                      {t('newChatConfirm.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              size="xs"
              variant="tertiary"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              iconLeft={isOpen ? <ChevronDown /> : <ChevronUp />}
            >
              {isOpen ? t('dock.collapse') : t('dock.expand')}
            </Button>
          </div>
        </header>

        {/*
          Danh sách tin nhắn chỉ tồn tại khi dock MỞ. Không phải để giấu — mà vì ở trạng thái thu
          gọn nó cao 0px, và một vùng cuộn cao 0 vẫn giữ `scrollTop`, nên lần mở sau sẽ hiện ra ở
          vị trí cuộn cũ thay vì ở tin mới nhất.
        */}
        {isOpen && (
          <>
            <UsageMeter />
            <div className="min-h-0 flex-1">
              <MessageList messages={messages} onDecide={decide} busy={isStreaming} />
            </div>
          </>
        )}

        <AgentComposer
          ref={composerRef}
          onSend={handleSend}
          onStop={cancelTurn}
          disabled={isStreaming}
          isStreaming={isStreaming}
          onFocus={handleComposerFocus}
          /**
           * Gợi ý chỉ hiện khi dock ĐANG MỞ. Lúc thu gọn người dùng đang nhìn cái bảng, và ba
           * hàng chip ở đó vừa không ai đọc vừa đẩy dock cao thêm ~46px — đúng phần chủ sản phẩm
           * yêu cầu cắt đi ("khung khoảng nhiêu đây thôi").
           */
          showSuggestions={isOpen && !hasMessages}
        />
      </div>
    </section>
  )
}
