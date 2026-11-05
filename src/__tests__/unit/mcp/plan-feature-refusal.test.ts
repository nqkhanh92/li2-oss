import { describe, it, expect } from 'vitest'
import { toolRefusalFor } from '@/core/mcp/tool-refusals'

/**
 * ★ Khoá một lỗi đã làm mất thời gian người dùng thật, 2026-10-29.
 *
 * Chủ sản phẩm nhắn *"Create a link to example.com with a password"*. Gói của org không có
 * `link_password`, back hop trả 403 — đúng. Nhưng không case nào khớp họ key `plan_errors.*`, nên
 * lỗi rơi xuống `backHopError(403)` và model nói lại:
 *
 *     "vai trò của bạn trong tổ chức này (hoặc gói đang dùng) không cho phép TẠO LINK.
 *      Bạn cần nhờ quản trị viên nâng quyền cho tài khoản…"
 *
 * Cả hai vế đều sai hướng: họ tạo link được bình thường, và nâng quyền tài khoản không giải quyết
 * gì. Thứ bị chặn là ô mật khẩu — bỏ nó ra là xong. Người dùng đi hỏi quản trị viên nhầm thứ.
 *
 * Một thông báo sai hướng tốn nhiều thời gian hơn là không có thông báo, vì nó khiến người ta tin
 * và đi theo.
 */

const planBody = (feature: string) => ({
  error: true,
  message: 'plan',
  i18nMessage: { key: `common:messages.error.plan_errors.${feature}`, params: {} },
})

describe('403 vì gói thiếu tính năng', () => {
  it('⭐ nêu ĐÚNG tên tính năng, không nói chung chung về vai trò', () => {
    const err = toolRefusalFor('create_short_link', 403, planBody('link_password'))

    expect(err).not.toBeNull()
    expect(err!.clientMessage).toContain('link_password')
    expect(err!.reason).toBe('org_not_entitled')
  })

  it('⭐ nói rõ ĐÂY KHÔNG PHẢI chuyện vai trò — đó là vế đã dẫn người dùng đi nhầm', () => {
    const err = toolRefusalFor('create_short_link', 403, planBody('link_password'))

    expect(err!.clientMessage).toMatch(/NOT about the user's role/i)
    // Và phải nói nâng gói mới là thứ mở ra, chứ không phải xin thêm quyền.
    expect(err!.clientMessage).toMatch(/upgrading the plan/i)
  })

  it('⭐ chỉ đúng tham số phải bỏ, để model nói được việc cụ thể', () => {
    const err = toolRefusalFor('create_short_link', 403, planBody('link_password'))

    expect(err!.clientMessage).toContain('`password`')
    expect(err!.clientMessage).toMatch(/will succeed/i)
  })

  it.each([
    ['link_expiration', 'expires_at'],
    ['link_targeting', 'targeting'],
    ['link_cloaking', 'cloaking'],
  ])('%s chỉ ra tham số `%s`', (feature, field) => {
    const err = toolRefusalFor('create_short_link', 403, planBody(feature))

    expect(err!.clientMessage).toContain(`\`${field}\``)
  })

  /**
   * Tính năng chưa có trong bảng ánh xạ vẫn phải ra câu dùng được — chỉ là chung hơn. Thiếu một
   * dòng trong `FEATURE_FIELD` không được phép làm lỗi rơi ngược về câu "vai trò" sai hướng.
   */
  it('tính năng lạ vẫn nêu tên và vẫn nói không phải chuyện vai trò', () => {
    const err = toolRefusalFor('create_short_link', 403, planBody('tinh_nang_chua_co_trong_bang'))

    expect(err!.clientMessage).toContain('tinh_nang_chua_co_trong_bang')
    expect(err!.clientMessage).toMatch(/NOT about the user's role/i)
  })

  /**
   * ⭐ Phép kiểm phải nằm ở tầng CHUNG, không trong bộ dịch của short link. Đặt sai chỗ thì mọi
   * tool artifact vẫn rơi về câu chung — sửa được một nửa, nửa kia im lặng giữ nguyên lỗi.
   */
  it('⭐ áp cho CẢ tool artifact, không riêng short link', () => {
    for (const tool of ['publish_artifact', 'set_artifact_access', 'publish_draft_artifact']) {
      const err = toolRefusalFor(tool, 403, planBody('link_password'))

      expect(err, tool).not.toBeNull()
      expect(err!.clientMessage, tool).toContain('link_password')
    }
  })
})

describe('KHÔNG nuốt những lỗi khác', () => {
  it('403 không phải lỗi gói thì để bộ dịch cũ xử lý', () => {
    const err = toolRefusalFor('create_short_link', 403, {
      i18nMessage: { key: 'common:messages.error.permission_error', params: {} },
    })

    // Có thể null (rơi về backHopError) hoặc là câu về vai trò — miễn KHÔNG phải câu về gói.
    // Kiểm bằng `reason` chứ không bằng chữ: câu về vai trò cũng có cụm "does not include", nên
    // so chuỗi ở đây sẽ đỏ vì một lý do không liên quan.
    expect(err?.reason).not.toBe('org_not_entitled')
  })

  it.each([400, 404, 409, 429, 500])('status %s KHÔNG bị nhận nhầm là lỗi gói', (status) => {
    const err = toolRefusalFor('create_short_link', status, planBody('link_password'))

    expect(err?.reason).not.toBe('org_not_entitled')
  })

  it('thân request không có i18nMessage thì không vỡ', () => {
    expect(() => toolRefusalFor('create_short_link', 403, null)).not.toThrow()
    expect(() => toolRefusalFor('create_short_link', 403, 'chuỗi trần')).not.toThrow()
  })
})
