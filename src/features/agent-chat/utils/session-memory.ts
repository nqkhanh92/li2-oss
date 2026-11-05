/**
 * Nhớ `session_id` qua các lần tải trang.
 *
 * ★ VÌ SAO. `sessionId` trước đây chỉ sống trong state React, nên F5 — hay đóng tab, hay rời trang
 * rồi quay lại — là mất, và lượt chat kế tiếp gửi `null` khiến server mở một phiên mới. Hệ quả
 * thấy được trên dữ liệu LiHi: 5 phiên trong 36 giây, mỗi phiên đúng 2 tin (một hỏi, một đáp).
 *
 * Hệ quả thật không phải bảng admin xấu, mà là **trợ lý quên sạch hội thoại sau mỗi lần tải lại
 * trang**: hỏi tiếp "đổi mật khẩu cái vừa nãy" thì nó không biết "vừa nãy" là gì.
 *
 * ⚠️ Đây CHỈ là chỗ nhớ một cái id. Bản thân lịch sử nằm ở DB và được `getHistory(sessionId)` nạp
 * theo đúng một phiên — chủ sản phẩm chốt 2026-11-02: *"LLM chat chỉ nhớ trong session thôi"*.
 * Không có bộ nhớ xuyên phiên nào, và file này không mở đường cho một cái.
 */

/** Khoá kèm org. Dùng chung một khoá thì đổi org sẽ gửi id phiên của org cũ. */
const keyFor = (orgId: string) => `li2.agent.session.${orgId}`

/**
 * Phiên sống 24 giờ.
 *
 * Hai lý do, lý do thứ hai nặng hơn:
 *  1. Qua đêm thì người ta coi là chuyện khác — sáng mai trợ lý nhắc tiếp chuyện tối qua là lạ.
 *  2. **Mỗi lượt chat gửi lại TOÀN BỘ lịch sử cho model.** Phiên ba tuần tuổi nghĩa là mỗi câu
 *     hỏi nhỏ cũng trả tiền cho ba tuần ngữ cảnh. Đây là thứ duy nhất trong sản phẩm tăng chi phí
 *     theo đầu người, nên để nó sống vô hạn là một quyết định về tiền, không chỉ về trải nghiệm.
 */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000

type Stored = { id: string; savedAt: number }

/**
 * `localStorage` ném khi bị chặn (chế độ riêng tư trên vài trình duyệt, hoặc hết dung lượng).
 * Hỏng thì quay về đúng hành vi cũ — mỗi lần tải trang một phiên mới — chứ không làm vỡ dock.
 */
const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/**
 * Đọc id đã lưu, hoặc `null` nếu chưa có / đã quá hạn / dữ liệu hỏng.
 *
 * ⚠️ Chỉ gọi SAU khi component đã gắn vào DOM. Server không có `localStorage`, nên đọc lúc khởi
 * tạo state sẽ cho hai giá trị khác nhau giữa server và trình duyệt — lỗi hydrate.
 */
export function readSessionId(orgId: string, now = Date.now()): string | null {
  return safe(() => {
    const raw = window.localStorage.getItem(keyFor(orgId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<Stored>
    if (typeof parsed?.id !== 'string' || typeof parsed?.savedAt !== 'number') return null
    if (now - parsed.savedAt > SESSION_TTL_MS) {
      // Dọn luôn thay vì để nằm đó: lần đọc sau cũng sẽ bỏ nó, nên giữ chỉ là rác.
      window.localStorage.removeItem(keyFor(orgId))
      return null
    }
    return parsed.id
  }, null)
}

/**
 * Lưu id, làm mới mốc thời gian.
 *
 * Gọi sau MỖI lượt chứ không chỉ lượt đầu: 24 giờ tính từ lần dùng gần nhất, không từ lúc mở
 * phiên. Ngồi chat suốt buổi chiều thì không bị cắt ngang giữa chừng.
 */
export function writeSessionId(orgId: string, id: string, now = Date.now()): void {
  safe(() => {
    const value: Stored = { id, savedAt: now }
    window.localStorage.setItem(keyFor(orgId), JSON.stringify(value))
  }, undefined)
}

/** Quên phiên — nút "Hội thoại mới", và khi đổi org. */
export function clearSessionId(orgId: string): void {
  safe(() => window.localStorage.removeItem(keyFor(orgId)), undefined)
}
