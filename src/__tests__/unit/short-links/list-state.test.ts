import { describe, expect, it } from 'vitest'

import { getShortLinkListState, hasActiveQuery } from '@/features/short-links/utils/list-state'

const base = { isLoading: false, isError: false, rowCount: 0 }

describe('getShortLinkListState', () => {
  /**
   * Đây là lỗi thật đo được trên LiHi: ép endpoint trả 500 kéo dài thì một org có 61 hàng hiện ra
   * "Chưa có link rút gọn nào" kèm nút tạo link đầu tiên. Khi truy vấn hỏng, `rowCount === 0` là
   * HỆ QUẢ của lỗi, không phải sự thật về dữ liệu.
   */
  it('lỗi tải KHÔNG được thành "chưa có gì"', () => {
    expect(getShortLinkListState({ ...base, isError: true })).toBe('error')
  })

  it('lỗi được xét TRƯỚC số hàng — kể cả khi đang có bộ lọc', () => {
    const state = getShortLinkListState({
      ...base,
      isError: true,
      search: 'abc',
      filters: { artifact_status: 'removed' },
    })

    expect(state).toBe('error')
    expect(state).not.toBe('no_match')
  })

  /**
   * Ca này tìm ra bằng kiểm nghịch: đảo thứ tự `isError` và `rowCount` thì mọi test đều vẫn xanh,
   * tức bộ test cũ không hề khoá quyết định đó.
   *
   * Khi refetch nền hỏng, TanStack Query giữ dữ liệu lần trước → vừa có hàng vừa có lỗi. Chọn
   * hiện lỗi: hàng cũ trông y như hàng mới, và lặng lẽ hiện dữ liệu cũ lúc máy chủ hỏng là cùng
   * một loại nói dối với bug đang sửa.
   */
  it('lỗi THẮNG cả khi còn hàng cũ từ lần tải trước', () => {
    expect(getShortLinkListState({ ...base, isError: true, rowCount: 20 })).toBe('error')
  })

  it('đang tải thì chưa kết luận gì', () => {
    expect(getShortLinkListState({ ...base, isLoading: true, isError: true })).toBe('loading')
  })

  it('có hàng → hiện hàng', () => {
    expect(getShortLinkListState({ ...base, rowCount: 20 })).toBe('rows')
  })

  it('rỗng mà đang lọc → "không khớp", KHÁC "chưa có gì"', () => {
    expect(getShortLinkListState({ ...base, filters: { artifact_status: 'removed' } })).toBe(
      'no_match'
    )
    expect(getShortLinkListState({ ...base, search: 'abc' })).toBe('no_match')
  })

  it('rỗng thật, không lọc gì → "chưa có gì"', () => {
    expect(getShortLinkListState({ ...base })).toBe('empty')
    expect(getShortLinkListState({ ...base, search: '', filters: {} })).toBe('empty')
  })

  it('bốn tình huống cho ra bốn trạng thái khác nhau — không cái nào trùng', () => {
    const states = [
      getShortLinkListState({ ...base, isError: true }),
      getShortLinkListState({ ...base, rowCount: 5 }),
      getShortLinkListState({ ...base, search: 'x' }),
      getShortLinkListState({ ...base }),
    ]

    expect(new Set(states).size).toBe(4)
  })
})

describe('hasActiveQuery', () => {
  it('mảng rỗng KHÔNG tính là đang lọc', () => {
    // Bỏ chọn hết tag để lại `tag_ids: []`. Tính đó là "đang lọc" thì một org rỗng thật sẽ hiện
    // "không có hàng nào khớp" kèm nút xoá bộ lọc không có gì để xoá.
    expect(hasActiveQuery('', { tag_ids: [] })).toBe(false)
    expect(hasActiveQuery('', { tag_ids: ['a'] })).toBe(true)
  })

  it('object rỗng (khoảng ngày đã xoá) không tính', () => {
    expect(hasActiveQuery('', { created_at: {} })).toBe(false)
    expect(hasActiveQuery('', { created_at: { from: '1' } })).toBe(true)
  })

  it('null, undefined, chuỗi rỗng đều không tính', () => {
    expect(hasActiveQuery('', { a: null, b: undefined, c: '' })).toBe(false)
  })

  it('tìm kiếm chỉ có khoảng trắng không tính', () => {
    expect(hasActiveQuery('   ', null)).toBe(false)
    expect(hasActiveQuery(' x ', null)).toBe(true)
  })

  it('không có gì cả → false', () => {
    expect(hasActiveQuery(undefined, undefined)).toBe(false)
  })
})
