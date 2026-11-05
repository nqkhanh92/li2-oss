import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AgentComposer } from '@/features/agent-chat/components/agent-composer'

/**
 * Khung soạn — phần đính kèm file và menu lệnh `/`.
 *
 * Thứ đáng khoá ở đây là **khoảnh khắc file rời trình duyệt**. Chủ sản phẩm chốt 2026-10-29 theo
 * lối Claude Desktop: chọn file → chip hiện ra, CHƯA gửi đi đâu; Enter mới gửi cả lời nhắn lẫn
 * file. Hai hướng sai đều tệ theo cách riêng:
 *   - gửi sớm → chọn nhầm file là nó đã lên server, phải đi xoá tay;
 *   - không gửi → người dùng tưởng đã đính kèm, trợ lý thì không thấy gì.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

const noop = () => {}

function setup(onSend = vi.fn()) {
  render(<AgentComposer onSend={onSend} onStop={noop} disabled={false} isStreaming={false} />)
  return { onSend }
}

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement
const textarea = () => screen.getByRole('textbox') as HTMLTextAreaElement

function pick(name: string, type: string, bytes = 1024) {
  const f = new File([new Uint8Array(bytes)], name, { type })
  fireEvent.change(fileInput(), { target: { files: [f] } })
  return f
}

beforeEach(() => vi.clearAllMocks())

describe('đính kèm file', () => {
  it('chọn file thì hiện chip — và KHÔNG gửi gì', () => {
    const { onSend } = setup()

    pick('catalog.pdf', 'application/pdf', 2_400_000)

    expect(screen.getByText('catalog.pdf')).toBeTruthy()
    expect(screen.getByText('PDF')).toBeTruthy()
    expect(screen.getByText('2.3 MB')).toBeTruthy()
    // ⭐ Chưa có lượt nào được gửi. Đây là nửa "không gửi sớm" của hợp đồng.
    expect(onSend).not.toHaveBeenCalled()
  })

  it('⭐ Enter gửi CẢ lời nhắn lẫn file', () => {
    const { onSend } = setup()
    const f = pick('catalog.pdf', 'application/pdf')

    fireEvent.change(textarea(), { target: { value: 'đăng file này' } })
    fireEvent.keyDown(textarea(), { key: 'Enter' })

    expect(onSend).toHaveBeenCalledWith('đăng file này', f)
  })

  it('không có file thì gửi null, không phải undefined lẫn lộn', () => {
    const { onSend } = setup()

    fireEvent.change(textarea(), { target: { value: 'chào' } })
    fireEvent.keyDown(textarea(), { key: 'Enter' })

    expect(onSend).toHaveBeenCalledWith('chào', null)
  })

  it('bấm ✕ gỡ chip và lượt sau không mang file', () => {
    const { onSend } = setup()
    pick('catalog.pdf', 'application/pdf')

    fireEvent.click(screen.getByLabelText('composer.removeFile'))
    expect(screen.queryByText('catalog.pdf')).toBeNull()

    fireEvent.change(textarea(), { target: { value: 'chào' } })
    fireEvent.keyDown(textarea(), { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('chào', null)
  })

  it('gửi xong thì chip biến mất — lượt sau KHÔNG gửi lại file cũ', () => {
    const { onSend } = setup()
    pick('catalog.pdf', 'application/pdf')
    fireEvent.change(textarea(), { target: { value: 'đăng' } })
    fireEvent.keyDown(textarea(), { key: 'Enter' })

    expect(screen.queryByText('catalog.pdf')).toBeNull()

    fireEvent.change(textarea(), { target: { value: 'còn gì nữa không' } })
    fireEvent.keyDown(textarea(), { key: 'Enter' })

    // Gửi lại file cũ sẽ tạo một artifact thứ hai mà không ai yêu cầu.
    expect(onSend).toHaveBeenLastCalledWith('còn gì nữa không', null)
  })

  /**
   * Chọn LẠI CÙNG một file sau khi gửi phải bắn `change`. Trình duyệt chỉ bắn sự kiện khi giá trị
   * đổi, nên không xoá `input.value` thì lần chọn thứ hai im lặng không có gì xảy ra — và người
   * dùng không hiểu tại sao.
   */
  it('⭐ xoá value của input file sau khi gửi', () => {
    setup()
    pick('catalog.pdf', 'application/pdf')
    fireEvent.change(textarea(), { target: { value: 'đăng' } })
    fireEvent.keyDown(textarea(), { key: 'Enter' })

    expect(fileInput().value).toBe('')
  })

  it('nhãn loại lấy từ MIME chứ không từ đuôi tên', () => {
    setup()
    // Đuôi do người dùng đặt và có thể nói dối; MIME do trình duyệt điền.
    pick('bao-cao.pdf', 'image/png')

    expect(screen.getByText('PNG')).toBeTruthy()
  })

  it('MIME lạ thì rơi về đuôi tên, không để trống', () => {
    setup()
    pick('ban-ve.sketch', '', 100)

    expect(screen.getByText('SKETC')).toBeTruthy()
  })
})

describe('menu lệnh /', () => {
  it('gõ / thì mở menu', () => {
    setup()
    fireEvent.change(textarea(), { target: { value: '/' } })

    expect(screen.getByRole('listbox')).toBeTruthy()
    expect(screen.getByText('/stats')).toBeTruthy()
  })

  it('⭐ KHÔNG có /trang — chủ sản phẩm chốt bỏ ở lượt đầu (mục 11)', () => {
    setup()
    fireEvent.change(textarea(), { target: { value: '/' } })

    expect(screen.queryByText('/trang')).toBeNull()
  })

  it('lọc theo chữ đang gõ', () => {
    setup()
    fireEvent.change(textarea(), { target: { value: '/st' } })

    expect(screen.getByText('/stats')).toBeTruthy()
    expect(screen.queryByText('/link')).toBeNull()
  })

  it('chọn một lệnh thì điền câu mẫu vào ô nhập, KHÔNG gửi ngay', () => {
    const { onSend } = setup()
    fireEvent.change(textarea(), { target: { value: '/' } })
    fireEvent.click(screen.getByText('/stats'))

    expect(textarea().value).toContain('nhiều lượt nhất')
    // Lệnh là một câu mẫu để người dùng sửa, không phải một nút bấm chạy luôn.
    expect(onSend).not.toHaveBeenCalled()
  })

  it('chữ không bắt đầu bằng / thì không mở menu', () => {
    setup()
    fireEvent.change(textarea(), { target: { value: 'tạo link /abc' } })

    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('Escape đóng menu bằng cách xoá ô nhập', () => {
    setup()
    fireEvent.change(textarea(), { target: { value: '/li' } })
    fireEvent.keyDown(textarea(), { key: 'Escape' })

    expect(screen.queryByRole('listbox')).toBeNull()
  })
})

describe('chips gợi ý', () => {
  it('chỉ hiện khi được bật, và bấm thì điền vào ô nhập', () => {
    const onSend = vi.fn()
    render(
      <AgentComposer
        onSend={onSend}
        onStop={noop}
        disabled={false}
        isStreaming={false}
        showSuggestions
      />
    )

    const chip = screen.getByText('examples.one')
    fireEvent.click(chip)

    expect(textarea().value).toBe('examples.one')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('ẩn chips khi đã chọn file — lúc đó gợi ý về link là lạc đề', () => {
    render(
      <AgentComposer
        onSend={vi.fn()}
        onStop={noop}
        disabled={false}
        isStreaming={false}
        showSuggestions
      />
    )
    pick('catalog.pdf', 'application/pdf')

    expect(screen.queryByText('examples.one')).toBeNull()
  })
})
