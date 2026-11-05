import { describe, it, expect } from 'vitest'
import { normalizeBaseUrl } from '@/core/agent/gateway'

/**
 * Khoá một lỗi đã nổ thật, 2026-10-29.
 *
 * Hai SDK hiểu `baseURL` khác nhau: `@anthropic-ai/sdk` nối `/v1/messages` nên baseURL phải KHÔNG
 * có `/v1`; `openai` chỉ nối `/chat/completions` nên baseURL phải CÓ. Đổi SDK mà quên đổi biến môi
 * trường thì request bay tới `…:20128/chat/completions` và nhận 404 kèm một trang HTML — thông báo
 * đó không nhắc gì tới `/v1`, nên người đọc đi tìm lỗi ở chỗ khác.
 *
 * Biến này được gõ tay vào `.env` trên server, nơi không có gì kiểm lại.
 */
describe('normalizeBaseUrl', () => {
  it('⭐ thêm /v1 khi thiếu — đúng cái đã gõ nhầm', () => {
    expect(normalizeBaseUrl('http://203.0.113.10:20128')).toBe('http://203.0.113.10:20128/v1')
  })

  it('giữ nguyên khi đã có /v1', () => {
    expect(normalizeBaseUrl('http://203.0.113.10:20128/v1')).toBe('http://203.0.113.10:20128/v1')
  })

  it('bỏ dấu / thừa ở cuối, cả hai dạng', () => {
    expect(normalizeBaseUrl('http://a.vn/v1/')).toBe('http://a.vn/v1')
    expect(normalizeBaseUrl('http://a.vn//')).toBe('http://a.vn/v1')
  })

  /** Đường dẫn con khác `/v1` phải được tôn trọng — một cổng đặt sau tiền tố riêng vẫn dùng được. */
  it('không phá đường dẫn con có sẵn', () => {
    expect(normalizeBaseUrl('http://a.vn/gateway')).toBe('http://a.vn/gateway/v1')
    expect(normalizeBaseUrl('http://a.vn/gateway/v1')).toBe('http://a.vn/gateway/v1')
  })
})
