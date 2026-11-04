import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Gộp class Tailwind, bản sau thắng bản trước khi trùng nhóm. Cùng hàm `cn` của li2-app. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Dùng bởi `components/ui/badge.tsx` cho badge có màu tuỳ chọn. Port từ li2-app. */
export function hexToRGBA(hex: string, opacity: number) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  const full = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b)
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full)
  if (!result || !result[1] || !result[2] || !result[3]) return hex
  const [r, g, b] = [result[1], result[2], result[3]].map((v) => parseInt(v, 16))
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
