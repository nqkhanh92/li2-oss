import { describe, it, expect } from 'vitest'

/**
 * Cổng quyết định dock chat hiện ở đâu — chốt chủ sản phẩm 2026-10-29 (mục 7):
 * *"hiện tại chat chỉ hiện trên trang link&artifact"*.
 *
 * Trước đó panel nằm trong layout org nên có mặt ở MỌI trang con, kể cả Analytics và Settings.
 *
 * Phép so khớp được tách ra khỏi component và test riêng, vì nó là một biểu thức chính quy ăn
 * đường dẫn do người dùng điều hướng tới. Hai hướng sai đều im lặng: quá rộng thì dock hiện ở
 * trang không ai muốn, quá hẹp thì nó biến mất ở đúng trang nó phải có mặt — và cả hai đều không
 * ném lỗi ở đâu cả.
 */

import { isLinkArtifactPage } from '@/features/agent-chat/utils/dock-visibility'

const ORG = 'c0ffee00-0000-4000-8000-000000000001'

describe('dock chỉ hiện trên trang Link & Artifact', () => {
  it.each([
    `/org/${ORG}/short-links`,
    `/org/${ORG}/short-links/`,
    `/org/${ORG}/short-links/abc-123`,
    `/org/${ORG}/short-links/abc-123?tab=detail`.split('?')[0],
  ])('HIỆN ở %s', (path) => {
    expect(isLinkArtifactPage(path)).toBe(true)
  })

  it.each([
    `/org/${ORG}/analytics`,
    `/org/${ORG}/settings`,
    `/org/${ORG}/customers`,
    `/org/${ORG}`,
    `/org/${ORG}/artifacts`,
    '/auth/login',
    '/',
  ])('KHÔNG hiện ở %s', (path) => {
    expect(isLinkArtifactPage(path)).toBe(false)
  })

  /**
   * ⚠ Cạm bẫy của một regex viết vội: `/short-links` **không có** neo `^/org/<id>/` sẽ khớp cả
   * `/org/<id>/short-links-archive`, và `(\/|$)` là thứ ngăn điều đó. Bỏ nó đi thì dock hiện ở
   * một trang chưa ai thiết kế cho nó.
   */
  it('KHÔNG khớp một route có cùng tiền tố tên', () => {
    expect(isLinkArtifactPage(`/org/${ORG}/short-links-archive`)).toBe(false)
    expect(isLinkArtifactPage(`/org/${ORG}/short-linksx`)).toBe(false)
  })

  it('pathname null (lần render đầu trên server) thì KHÔNG hiện', () => {
    // `usePathname()` có thể trả null; coi đó là "chưa biết" và không hiện gì còn hơn là nhấp nháy
    // một dock rồi lại giấu đi.
    expect(isLinkArtifactPage(null)).toBe(false)
  })

  it('không khớp đường dẫn thiếu phần org', () => {
    expect(isLinkArtifactPage('/short-links')).toBe(false)
    expect(isLinkArtifactPage('/org//short-links')).toBe(false)
  })
})
