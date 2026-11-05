'use client'

/**
 * Khung soạn của dock chat — gõ chữ, đính kèm file, chips gợi ý, menu lệnh `/`.
 *
 * ★ **Enter là khoảnh khắc file rời trình duyệt.** Chủ sản phẩm chốt 2026-10-29 theo lối Claude
 * Desktop: bấm `+` → chọn file → nó thành một chip ngay trong khung này, chưa gì lên mạng; gõ lời
 * nhắn rồi Enter thì cả hai đi cùng một request. Không có nút "Publish" riêng (mục 5 đã bỏ mọi nút
 * trong luồng hội thoại), mà chọn nhầm file cũng không gửi đi đâu (mục 6) — bấm ✕ là xong.
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { Paperclip, SendHorizontal, Square, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/lib/utils'

interface AgentComposerProps {
  onSend: (text: string, file?: File | null) => void
  onStop: () => void
  disabled: boolean
  isStreaming: boolean
  /** Ẩn chips khi hội thoại đã bắt đầu — gợi ý chỉ có nghĩa lúc chưa biết gõ gì. */
  showSuggestions?: boolean
  /** Con trỏ vào ô gõ. Dock dùng để tự mở ra — xem `handleComposerFocus`. */
  onFocus?: () => void
}

export interface AgentComposerHandle {
  focus: () => void
}

/**
 * Lệnh `/`. Mỗi lệnh chỉ là một câu mẫu điền sẵn vào ô nhập, KHÔNG phải một đường đi riêng ở
 * server — model đọc câu đó như mọi câu khác.
 *
 * Làm vậy vì một lệnh có đường riêng sẽ là tập luật thứ hai cạnh prompt hệ thống, và hai tập luật
 * về cùng một việc thì sớm muộn cũng lệch nhau. Ở đây `/stats` và "cho xem số liệu đi" đi chung
 * một đường, nên không thể hành xử khác nhau.
 *
 * ⚠ KHÔNG có `/trang` — chủ sản phẩm chốt bỏ ở lượt đầu (mục 11).
 */
const SLASH_COMMANDS = [
  { cmd: '/link', labelKey: 'slash.link', fill: 'rút gọn link ' },
  { cmd: '/file', labelKey: 'slash.file', fill: '', attach: true },
  { cmd: '/qr', labelKey: 'slash.qr', fill: 'cho mình mã QR của link vừa tạo' },
  { cmd: '/stats', labelKey: 'slash.stats', fill: '30 ngày qua link nào nhiều lượt nhất?' },
] as const

const SUGGESTIONS = ['examples.one', 'examples.two', 'examples.three'] as const

/** Nhãn ngắn cho chip file: "PDF", "PNG"… Lấy từ MIME chứ không từ đuôi tên — đuôi tên do người
 *  dùng đặt và có thể nói dối, còn MIME do trình duyệt điền. */
function shortType(contentType: string, fileName: string): string {
  const sub = contentType.split('/')[1] ?? ''
  const clean = sub.split(/[+.;]/)[0]
  if (clean && clean.length <= 5) return clean.toUpperCase()
  const ext = fileName.includes('.') ? fileName.split('.').pop() : ''
  return (ext || 'FILE').toUpperCase().slice(0, 5)
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const AgentComposer = forwardRef<AgentComposerHandle, AgentComposerProps>(
  function AgentComposer(
    { onSend, onStop, disabled, isStreaming, showSuggestions = false, onFocus },
    ref
  ) {
    const { t } = useTranslation('agent-chat')
    const [value, setValue] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }))

    const slashOpen = value.startsWith('/')

    const submit = () => {
      const trimmed = value.trim()
      if (!trimmed || disabled) return
      onSend(trimmed, file)
      setValue('')
      setFile(null)
      // Xoá giá trị của input file, nếu không chọn LẠI CÙNG một file sẽ không bắn `change`.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter xác nhận một tổ hợp IME (Telex/VNI, pinyin…) thì KHÔNG được gửi.
      if (e.nativeEvent.isComposing) return
      if (e.key === 'Escape' && slashOpen) {
        setValue('')
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        submit()
      }
    }

    const pickFile = (e: ChangeEvent<HTMLInputElement>) => {
      const chosen = e.target.files?.[0]
      if (chosen) setFile(chosen)
    }

    const runSlash = (entry: (typeof SLASH_COMMANDS)[number]) => {
      setValue(entry.fill)
      if ('attach' in entry && entry.attach) fileInputRef.current?.click()
      textareaRef.current?.focus()
    }

    return (
      <div className="flex flex-col gap-2 border-t border-slate-200 p-3">
        {showSuggestions && !file && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setValue(t(key))
                  textareaRef.current?.focus()
                }}
                className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-600 transition hover:bg-slate-50"
              >
                {t(key)}
              </button>
            ))}
          </div>
        )}

        {file && (
          <div className="flex w-fit max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
            <span className="shrink-0 rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-700">
              {shortType(file.type, file.name)}
            </span>
            <span className="truncate text-slate-700">{file.name}</span>
            <span className="shrink-0 text-slate-400">{humanSize(file.size)}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              aria-label={t('composer.removeFile')}
              className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="relative">
          {slashOpen && (
            <div
              role="listbox"
              aria-label={t('composer.commands')}
              className="absolute bottom-[calc(100%+8px)] left-0 z-10 w-80 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
            >
              {SLASH_COMMANDS.filter((e) => e.cmd.startsWith(value.split(' ')[0])).map((entry) => (
                <button
                  key={entry.cmd}
                  type="button"
                  onClick={() => runSlash(entry)}
                  className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left transition hover:bg-slate-100"
                >
                  <code className="w-16 shrink-0 text-xs font-semibold text-slate-900">
                    {entry.cmd}
                  </code>
                  <span className="text-sm text-slate-600">{t(entry.labelKey)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={pickFile}
              aria-hidden
              tabIndex={-1}
            />
            <Button
              size="icon"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              aria-label={t('composer.attach')}
            >
              <Paperclip />
            </Button>

            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              placeholder={t('composer.placeholder')}
              rows={1}
              className={cn('max-h-32 min-h-[40px] resize-none overflow-y-auto')}
            />

            {isStreaming ? (
              <Button size="icon" variant="secondary" onClick={onStop} aria-label={t('stop')}>
                <Square />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="default"
                onClick={submit}
                disabled={disabled || !value.trim()}
                aria-label={t('composer.send')}
              >
                <SendHorizontal />
              </Button>
            )}
          </div>
        </div>

        {/*
          Dòng `composer.footnote` ("I create things right away…") đã GỠ 2026-11-02 theo yêu cầu
          chủ sản phẩm. Nó chiếm một hàng ở mọi trạng thái để nói một quy tắc người dùng học được
          sau lần dùng đầu tiên — và chính quy tắc đó đã nằm trong prompt hệ thống, nên trợ lý vẫn
          hành xử y vậy. Khoá i18n giữ lại, chưa xoá.
        */}
      </div>
    )
  }
)
