import { describe, it, expect } from 'vitest'
import { describeTurnError } from '@/core/agent/turn'

/**
 * Khoá một lỗi VẬN HÀNH đã xảy ra thật, 2026-10-29.
 *
 * `LI2_AI_GATEWAY_URL` được đặt bằng địa chỉ công khai `203.0.113.10:20128`. Từ máy lập trình thì
 * `curl` chạy ngon; từ chính server LiHi (nằm trong cùng LAN, `172.18.0.24/24`) thì **không tới
 * được** — hairpin NAT. Mỗi lượt chat treo 180 giây rồi hiện đúng bốn chữ:
 *
 *     Request timed out.
 *
 * Câu đó không sai, nhưng nó không nhắc tới mạng, không nhắc tới cấu hình, không chỉ chỗ nào để
 * tìm. Người đọc sẽ nghĩ model chậm. Một lỗi vận hành phải tự nói ra nó là lỗi vận hành — nếu
 * không, nó trở thành một giờ đi tìm nhầm hướng.
 */
describe('describeTurnError', () => {
  it.each([
    'Request timed out.',
    'fetch failed',
    'connect ECONNREFUSED 172.18.0.21:20128',
    'getaddrinfo ENOTFOUND gateway.local',
    'connect EHOSTUNREACH 10.0.0.1:20128',
    'ETIMEDOUT',
  ])('⭐ lỗi mạng "%s" được giải thích, không để trần', (raw) => {
    const msg = describeTurnError(new Error(raw))

    // Phải nêu tên biến cấu hình — đó là thứ người đọc cần đi sửa.
    expect(msg).toContain('LI2_AI_GATEWAY_URL')
    // Và vẫn giữ lời nhắn gốc, để người tra log khớp được hai đầu.
    expect(msg).toContain(raw)
  })

  it.each(['401 Unauthorized', 'invalid api key', '403 forbidden'])(
    'lỗi khoá "%s" chỉ sang LI2_AI_GATEWAY_KEY chứ không sang URL',
    (raw) => {
      const msg = describeTurnError(new Error(raw))

      expect(msg).toContain('LI2_AI_GATEWAY_KEY')
      expect(msg).not.toContain('LI2_AI_GATEWAY_URL')
    }
  )

  /**
   * Lỗi của chính model (nội dung bị chặn, vượt ngữ cảnh…) KHÔNG được khoác áo lỗi hạ tầng —
   * làm vậy sẽ đẩy người đọc đi kiểm mạng trong khi mạng không sao.
   */
  it('lỗi không thuộc hai nhóm trên đi qua nguyên văn', () => {
    expect(describeTurnError(new Error('context length exceeded'))).toBe('context length exceeded')
  })

  it('giá trị không phải Error cũng không làm vỡ', () => {
    expect(describeTurnError('chuỗi trần')).toBe('chuỗi trần')
    expect(describeTurnError(null)).toBe('null')
  })
})
