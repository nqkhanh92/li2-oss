/**
 * @vitest-environment jsdom
 *
 * Cần `window.localStorage`. `vitest.config.ts` chỉ cho jsdom với `use-*.test.ts` và `*.test.tsx`
 * (xem CLAUDE.md §Testing); file này là `.ts` thuần và không phải hook, nên phải khai tay.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  SESSION_TTL_MS,
  readSessionId,
  writeSessionId,
  clearSessionId,
} from '@/features/agent-chat/utils/session-memory'

/**
 * Nhớ `session_id` qua các lần tải trang.
 *
 * ★ VÌ SAO FILE NÀY TỒN TẠI. Trước 2026-11-02, `sessionId` chỉ sống trong state React — F5 là
 * mất, và lượt chat kế tiếp gửi `null` khiến server mở phiên mới. Đo được trên LiHi:
 *
 * ```
 * 09:29:19  2 tin      09:29:34  2 tin      09:29:55  2 tin
 * 09:29:21  2 tin      09:29:42  2 tin
 * ```
 * Năm phiên trong 36 giây, mỗi phiên đúng một hỏi một đáp.
 *
 * Hệ quả thật không phải bảng admin xấu, mà là **trợ lý quên sạch sau mỗi lần tải trang**.
 */

const ORG = 'org-abc'
const OTHER_ORG = 'org-xyz'
const SID = '7f3a9c21-4b5e-4f0a-9d8c-1e2f3a4b5c6d'
const T0 = 1_700_000_000_000

beforeEach(() => window.localStorage.clear())

describe('ghi rồi đọc lại', () => {
  it('⭐ đọc lại đúng id — chính là thứ làm F5 không mất hội thoại', () => {
    writeSessionId(ORG, SID, T0)

    expect(readSessionId(ORG, T0 + 1000)).toBe(SID)
  })

  it('chưa ghi gì thì null, không ném', () => {
    expect(readSessionId(ORG, T0)).toBeNull()
  })

  it('xoá rồi thì null — nút "Hội thoại mới" dựa vào đây', () => {
    writeSessionId(ORG, SID, T0)
    clearSessionId(ORG)

    expect(readSessionId(ORG, T0)).toBeNull()
  })
})

describe('⭐ tách theo tổ chức', () => {
  /**
   * Dùng chung một khoá thì đổi org sẽ gửi id phiên của org cũ. Server chặn được
   * (`getOrCreateSession` kiểm `org_id` + `user_id`), nhưng mỗi lần đổi org lại đẻ một phiên rác
   * — đúng cái đang sửa.
   */
  it('⭐ org khác không thấy phiên của org này', () => {
    writeSessionId(ORG, SID, T0)

    expect(readSessionId(OTHER_ORG, T0)).toBeNull()
  })

  it('hai org giữ hai phiên riêng, không đè nhau', () => {
    writeSessionId(ORG, 'phien-cua-A', T0)
    writeSessionId(OTHER_ORG, 'phien-cua-B', T0)

    expect(readSessionId(ORG, T0)).toBe('phien-cua-A')
    expect(readSessionId(OTHER_ORG, T0)).toBe('phien-cua-B')
  })

  it('xoá org này không đụng org kia', () => {
    writeSessionId(ORG, 'phien-cua-A', T0)
    writeSessionId(OTHER_ORG, 'phien-cua-B', T0)
    clearSessionId(ORG)

    expect(readSessionId(ORG, T0)).toBeNull()
    expect(readSessionId(OTHER_ORG, T0)).toBe('phien-cua-B')
  })
})

describe('⭐ hết hạn 24 giờ', () => {
  it('trong 24 giờ thì còn', () => {
    writeSessionId(ORG, SID, T0)

    expect(readSessionId(ORG, T0 + SESSION_TTL_MS - 1)).toBe(SID)
  })

  it('⭐ quá 24 giờ thì mất — sáng mai là cuộc khác', () => {
    writeSessionId(ORG, SID, T0)

    expect(readSessionId(ORG, T0 + SESSION_TTL_MS + 1)).toBeNull()
  })

  /**
   * ⭐ 24 giờ tính từ lần DÙNG gần nhất, không từ lúc mở phiên. Provider ghi lại sau MỖI lượt, nên
   * ngồi chat cả buổi chiều không bị cắt ngang giữa chừng.
   */
  it('⭐ ghi lại làm mới đồng hồ, không giữ mốc cũ', () => {
    writeSessionId(ORG, SID, T0)
    const nearlyExpired = T0 + SESSION_TTL_MS - 1000
    writeSessionId(ORG, SID, nearlyExpired)

    expect(readSessionId(ORG, nearlyExpired + SESSION_TTL_MS - 1000)).toBe(SID)
  })

  it('bản quá hạn bị dọn khỏi localStorage, không nằm lại làm rác', () => {
    writeSessionId(ORG, SID, T0)
    readSessionId(ORG, T0 + SESSION_TTL_MS + 1)

    expect(window.localStorage.getItem(`li2.agent.session.${ORG}`)).toBeNull()
  })
})

describe('dữ liệu hỏng thì bỏ qua, không làm vỡ dock', () => {
  const rac: [string, string][] = [
    ['không phải JSON', 'cái-gì-đó'],
    ['JSON nhưng thiếu id', '{"savedAt":1}'],
    ['JSON nhưng thiếu savedAt', '{"id":"abc"}'],
    ['id không phải chuỗi', '{"id":123,"savedAt":1}'],
    ['savedAt không phải số', '{"id":"abc","savedAt":"hôm qua"}'],
    ['rỗng', ''],
  ]

  it.each(rac)('%s → null', (_ten, raw) => {
    window.localStorage.setItem(`li2.agent.session.${ORG}`, raw)

    expect(readSessionId(ORG, T0)).toBeNull()
  })

  /**
   * `localStorage` ném khi bị chặn (chế độ riêng tư trên vài trình duyệt) hoặc khi hết dung lượng.
   * Lúc đó phải quay về đúng hành vi CŨ — mỗi lần tải trang một phiên mới — chứ không làm vỡ dock
   * chat. Một tính năng tiện nghi không được phép hạ gục thứ nó định làm tiện hơn.
   */
  it('⭐ localStorage bị chặn → trả null thay vì ném', () => {
    const real = window.localStorage.getItem
    window.localStorage.getItem = () => {
      throw new Error('SecurityError')
    }

    expect(() => readSessionId(ORG, T0)).not.toThrow()
    expect(readSessionId(ORG, T0)).toBeNull()

    window.localStorage.getItem = real
  })

  it('⭐ localStorage bị chặn lúc GHI → không ném, lượt chat vẫn chạy', () => {
    const real = window.localStorage.setItem
    window.localStorage.setItem = () => {
      throw new Error('QuotaExceededError')
    }

    expect(() => writeSessionId(ORG, SID, T0)).not.toThrow()

    window.localStorage.setItem = real
  })
})
