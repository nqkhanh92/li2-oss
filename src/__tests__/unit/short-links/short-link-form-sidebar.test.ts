import { describe, it, expect } from 'vitest'
import {
  DIMMED_SIDEBAR_ITEMS,
  SIDEBAR_GROUPS,
  SIDEBAR_ITEM_ICONS,
  SIDEBAR_ITEM_KEYS,
  SIDEBAR_ITEM_LABELS,
} from '@/features/short-links/components/short-link-form/short-link-form.constants'

/**
 * Bố cục sidebar của form tạo short link, chốt với chủ sản phẩm 2026-10-23:
 * Tags chuyển từ sidebar chính về đây và đứng ngay dưới Link Cloaking; ba mục pixel hiện ra
 * nhưng làm mờ, không bấm được.
 */
describe('sidebar form short link', () => {
  it('Tags đứng ngay DƯỚI Link Cloaking', () => {
    const cloaking = SIDEBAR_ITEM_KEYS.indexOf('link_cloaking')
    const tags = SIDEBAR_ITEM_KEYS.indexOf('tags')
    expect(cloaking).toBeGreaterThanOrEqual(0)
    expect(tags).toBe(cloaking + 1)
  })

  it('ba mục pixel bị làm mờ', () => {
    expect(DIMMED_SIDEBAR_ITEMS).toEqual(['fb_pixel', 'ga_tracking', 'tiktok_pixel'])
  })

  it('mục làm mờ vẫn nằm trong sidebar — mờ khác với bỏ hẳn', () => {
    for (const key of DIMMED_SIDEBAR_ITEMS) {
      expect(SIDEBAR_ITEM_KEYS).toContain(key)
    }
  })

  it('mọi mục trong sidebar đều có icon và nhãn, không có mục trơ', () => {
    for (const group of SIDEBAR_GROUPS) {
      for (const key of group.items) {
        expect(SIDEBAR_ITEM_ICONS[key], `thiếu icon cho ${key}`).toBeTruthy()
        expect(SIDEBAR_ITEM_LABELS[key], `thiếu nhãn cho ${key}`).toBeTruthy()
      }
    }
  })
})
