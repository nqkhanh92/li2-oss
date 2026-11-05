'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { DOCK_HEIGHT_STORAGE_KEY, clampDockHeight, defaultOpenHeight } from '../utils/dock-size'

/**
 * Kéo mép trên của dock để đổi chiều cao.
 *
 * ★ Chủ sản phẩm yêu cầu 2026-11-02: *"cho kéo chuột chỉnh size phù hợp"*. Một dock cao cố định
 * sai với mọi người — người đọc bảng muốn nó thấp, người đang hỏi han muốn nó cao.
 *
 * ⚠️ `pointer` chứ không `mouse`: cùng một đường cho chuột, bút và ngón tay, và `setPointerCapture`
 * giữ được chuỗi sự kiện kể cả khi con trỏ chạy ra ngoài tay nắm — kéo nhanh thì nó chạy ra ngoài
 * liên tục, và với `mousemove` trên chính phần tử đó thì thanh kéo sẽ rớt giữa chừng.
 *
 * Nhớ chiều cao qua `localStorage`: người ta kéo một lần rồi muốn nó ở yên đó.
 */
export function useDockResize(enabled: boolean) {
  const [height, setHeight] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const drag = useRef<{ startY: number; startHeight: number } | null>(null)

  /**
   * Đọc `localStorage` sau khi gắn vào DOM, không phải lúc khởi tạo state: server không có
   * `localStorage`, và một giá trị khác nhau giữa server với client là lỗi hydrate.
   */
  useEffect(() => {
    const vh = window.innerHeight
    const saved = Number(window.localStorage.getItem(DOCK_HEIGHT_STORAGE_KEY))
    setHeight(
      Number.isFinite(saved) && saved > 0 ? clampDockHeight(saved, vh) : defaultOpenHeight(vh)
    )
  }, [])

  /** Màn hình co lại thì chiều cao đã lưu có thể vượt trần mới. */
  useEffect(() => {
    const onResize = () =>
      setHeight((h) => (h === null ? h : clampDockHeight(h, window.innerHeight)))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || height === null) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { startY: e.clientY, startHeight: height }
      setIsDragging(true)
    },
    [enabled, height]
  )

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    // Kéo LÊN là cao thêm, nên `startY - clientY`: dock mọc từ đáy màn hình.
    setHeight(clampDockHeight(d.startHeight + (d.startY - e.clientY), window.innerHeight))
  }, [])

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!drag.current) return
      drag.current = null
      setIsDragging(false)
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      if (height !== null) window.localStorage.setItem(DOCK_HEIGHT_STORAGE_KEY, String(height))
    },
    [height]
  )

  /**
   * Bàn phím cũng phải chỉnh được — tay nắm là một `separator` có `tabIndex`, và một thanh chỉ
   * kéo được bằng chuột thì người dùng bàn phím không có cách nào khác.
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (height === null) return
      const step = e.shiftKey ? 80 : 24
      let next: number | null = null
      if (e.key === 'ArrowUp') next = height + step
      else if (e.key === 'ArrowDown') next = height - step
      if (next === null) return
      e.preventDefault()
      const clamped = clampDockHeight(next, window.innerHeight)
      setHeight(clamped)
      window.localStorage.setItem(DOCK_HEIGHT_STORAGE_KEY, String(clamped))
    },
    [height]
  )

  return { height, isDragging, onPointerDown, onPointerMove, endDrag, onKeyDown }
}
