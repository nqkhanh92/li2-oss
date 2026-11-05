import { describe, it, expect } from 'vitest'
import {
  parseConversationListQuery,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '@/core/helpers/admin-stats/conversation-query'

const q = (s: string) => parseConversationListQuery(new URLSearchParams(s))

describe('parseConversationListQuery', () => {
  it('mặc định khi không có tham số nào', () => {
    expect(q('')).toEqual({
      page: 1,
      limit: DEFAULT_LIMIT,
      organizationId: undefined,
      sortBy: 'created_at',
      sortOrder: 'desc',
      range: undefined,
      onlyToolErrors: false,
    })
  })

  it('đọc đủ tham số hợp lệ', () => {
    const p = q(
      'page=3&limit=50&sort_by=tool_error_count&sort_order=asc&organization_id=org-1&search=mcp&has_tool_errors=true'
    )
    expect(p).toMatchObject({
      page: 3,
      limit: 50,
      sortBy: 'tool_error_count',
      sortOrder: 'asc',
      organizationId: 'org-1',
      onlyToolErrors: true,
    })
  })

  describe('chặn giá trị phá hoại mà không trả 400', () => {
    it('limit vượt trần bị kẹp', () => {
      expect(q('limit=100000').limit).toBe(MAX_LIMIT)
    })

    it('page và limit âm hoặc 0 về giá trị nhỏ nhất hợp lệ', () => {
      expect(q('page=0&limit=0')).toMatchObject({ page: 1, limit: 1 })
      expect(q('page=-5&limit=-5')).toMatchObject({ page: 1, limit: 1 })
    })

    it('số không nguyên và chữ → mặc định', () => {
      expect(q('page=abc&limit=2.7')).toMatchObject({ page: 1, limit: DEFAULT_LIMIT })
    })

    it('sort_by lạ → created_at, KHÔNG đưa chuỗi của người gọi xuống SQL', () => {
      expect(q('sort_by=id; drop table agent_sessions').sortBy).toBe('created_at')
      expect(q('sort_by=content').sortBy).toBe('created_at')
      expect(q('sort_by=org_id').sortBy).toBe('created_at')
    })

    it('sort_order chỉ nhận asc, còn lại là desc', () => {
      expect(q('sort_order=asc').sortOrder).toBe('asc')
      expect(q('sort_order=ASC').sortOrder).toBe('desc')
      expect(q('sort_order=xyz').sortOrder).toBe('desc')
    })
  })

  describe('has_tool_errors', () => {
    it('nhận true, 1, yes — vì cờ này sẽ nằm trên URL người ta gửi nhau', () => {
      expect(q('has_tool_errors=true').onlyToolErrors).toBe(true)
      expect(q('has_tool_errors=1').onlyToolErrors).toBe(true)
      expect(q('has_tool_errors=YES').onlyToolErrors).toBe(true)
    })

    it('rác và false → không lọc, chứ không lọc sai', () => {
      expect(q('has_tool_errors=false').onlyToolErrors).toBe(false)
      expect(q('has_tool_errors=maybe').onlyToolErrors).toBe(false)
      expect(q('has_tool_errors=').onlyToolErrors).toBe(false)
    })
  })

  describe('khoảng ngày', () => {
    it('cả hai đầu hợp lệ thì lọc', () => {
      expect(q('start_date=2026-10-01&end_date=2026-10-27').range).toEqual({
        from: '2026-10-01',
        to: '2026-10-27',
        toExclusive: '2026-10-28',
      })
    })

    it('một đầu thiếu hoặc rác → KHÔNG lọc ngày, không tự cắt về 30 ngày', () => {
      expect(q('start_date=2026-10-01').range).toBeUndefined()
      expect(q('start_date=2026-10-01&end_date=hom-qua').range).toBeUndefined()
      expect(q('start_date=2026-02-31&end_date=2026-03-01').range).toBeUndefined()
    })
  })
})

/**
 * ⭐ `search` đã bị GỠ, và đây là test giữ cho nó không lặng lẽ quay lại.
 *
 * Trường văn bản duy nhất tìm được là `agent_sessions.title` — 120 ký tự đầu tin nhắn của người
 * dùng (`agent-chat.repository.ts:245`). Tìm được nghĩa là **dò được**: gõ thử vài từ rồi xem
 * phiên nào khớp là đọc được nội dung.
 *
 * Và nhận tham số rồi lặng lẽ bỏ qua còn tệ hơn không nhận — bên gọi dựng ô tìm kiếm, gõ vào
 * không ra gì, rồi đi tìm lỗi ở phía mình. Nên parser phải KHÔNG sinh ra khoá đó.
 */
describe('⭐ không nhận search', () => {
  it('⭐ `?search=...` bị bỏ qua hoàn toàn — không có khoá `search` trong kết quả', () => {
    const parsed = parseConversationListQuery(new URLSearchParams('search=hunter2'))

    expect('search' in parsed).toBe(false)
  })

  it('và nó không lọt vào dưới một tên khác', () => {
    const parsed = parseConversationListQuery(new URLSearchParams('search=hunter2'))

    expect(JSON.stringify(parsed)).not.toContain('hunter2')
  })
})
