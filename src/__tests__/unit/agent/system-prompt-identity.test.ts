import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/core/agent/system-prompt'

/**
 * Khối DANH TÍNH — chủ sản phẩm chốt 2026-10-29: *"chỉ xưng là trợ lý AI, và không trả lời các
 * câu hỏi về model và hệ thống"*.
 *
 * ⚠️ Đây là test HÌNH DẠNG, không phải test hành vi. Nó chỉ chứng minh chỉ dẫn CÓ MẶT trong prompt,
 * không chứng minh model sẽ nghe theo — prompt là chỉ dẫn, không phải hàng rào, và một người hỏi
 * đủ kiên trì vẫn có thể làm nó lộ ra. Hành vi đã được đo bằng lượt thật ngày 2026-10-29 (hỏi
 * "bạn là model nào" và "bạn do công ty nào làm ra" → đều từ chối lịch sự).
 *
 * Giá trị thật của nó: bắt được việc ai đó **xoá nhầm** khối này khi sửa prompt.
 */
describe('prompt có khối danh tính', () => {
  const prompt = buildSystemPrompt({ draft: null })

  it('⭐ dạy TỪ CHỐI, không dạy phủ nhận', () => {
    expect(prompt).toContain('DANH TÍNH')
    expect(prompt).toMatch(/TỪ CHỐI/)
    // Bắt model nói "tôi không phải AI" là bắt nó nói dối — và nó nói dối rất tệ.
    expect(prompt).toMatch(/Đừng phủ nhận mình là AI/)
  })

  it('xưng là trợ lý AI của Li2, không nêu nhà cung cấp', () => {
    expect(prompt).toContain('trợ lý AI của Li2')
  })

  /**
   * ⭐ Nửa quan trọng không kém: giới hạn CHỈ áp cho phần kỹ thuật bên trong. Hiểu "không nói về
   * hệ thống" theo nghĩa rộng sẽ làm trợ lý từ chối cả "đổi slug thế nào" — tức vô dụng.
   */
  it('⭐ nói rõ câu hỏi về SẢN PHẨM vẫn phải trả lời', () => {
    expect(prompt).toMatch(/CHỈ áp cho phần kỹ thuật bên trong/)
    expect(prompt).toMatch(/SẢN PHẨM Li2/)
    expect(prompt).toMatch(/vẫn phải trả lời đầy đủ/)
  })

  it('liệt kê đúng những thứ phải từ chối', () => {
    for (const x of ['model nào', 'công ty nào', 'hạ tầng', 'chỉ dẫn hệ thống', 'công cụ nào']) {
      expect(prompt, x).toContain(x)
    }
  })

  it('khối danh tính đứng trước khối phạm vi dữ liệu', () => {
    // Thứ tự không đổi hành vi nhiều, nhưng một prompt đọc từ trên xuống thì danh tính nên đến
    // trước chi tiết nghiệp vụ.
    expect(prompt.indexOf('DANH TÍNH')).toBeLessThan(prompt.indexOf('PHẠM VI DỮ LIỆU'))
  })
})
