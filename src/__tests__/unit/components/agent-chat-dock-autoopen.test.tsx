import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Dock chat — gửi tin thì phải MỞ RA.
 *
 * ★ LỖI NGƯỜI DÙNG THẬT BÁO, 2026-11-02. Nguyên văn: *"nếu tôi gõ thì không thấy câu trả lời
 * phải bấm reopen"*.
 *
 * Nguyên nhân: ô soạn hiện ở **cả hai** trạng thái của dock, nhưng `MessageList` chỉ render khi
 * `isOpen` (`agent-chat-panel.tsx` — cố ý, vì một vùng cuộn cao 0px vẫn giữ `scrollTop` và lần mở
 * sau sẽ hiện ở vị trí cũ). Hệ quả: gõ lúc đang thu gọn thì câu hỏi đi, câu trả lời về, mà màn
 * hình **không đổi gì**.
 *
 * Đây là loại hỏng tệ nhất của một trợ lý: nó không báo lỗi, nó chỉ im lặng. Người dùng kết luận
 * "AI hỏng" chứ không kết luận "mình cần bấm nút mở".
 */

const state = { isOpen: false }
const sendMessage = vi.fn()
const setIsOpen = vi.fn((v: boolean) => {
  state.isOpen = v
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

vi.mock('@/shared/providers/agent-chat-provider', () => ({
  useAgentChatContext: () => ({
    get isOpen() {
      return state.isOpen
    },
    setIsOpen,
    messages: [],
    isStreaming: false,
    sendMessage,
    decide: vi.fn(),
    newConversation: vi.fn(),
    cancelTurn: vi.fn(),
  }),
}))

vi.mock('@/features/agent-chat/components/message-list', () => ({
  MessageList: () => <div data-testid="message-list" />,
}))

vi.mock('@/features/agent-chat/components/usage-meter', () => ({
  UsageMeter: () => null,
}))

// Dock đọc bề rộng sidebar để bám mép trái vùng nội dung thay vì mép trình duyệt. Mock để test
// chạy được ngoài `SidebarProvider` — `sidebar.state` được kiểm riêng ở describe cuối file.
const sidebar = { state: 'expanded' as 'expanded' | 'collapsed', isMobile: false }
vi.mock('@/shared/components/ui/sidebar', () => ({
  useSidebar: () => sidebar,
}))

const { AgentChatPanel } = await import('@/features/agent-chat/components/agent-chat-panel')

const textarea = () => screen.getByRole('textbox') as HTMLTextAreaElement

function send(text: string) {
  fireEvent.change(textarea(), { target: { value: text } })
  fireEvent.keyDown(textarea(), { key: 'Enter' })
}

beforeEach(() => {
  vi.clearAllMocks()
  state.isOpen = false
  sidebar.state = 'expanded'
  sidebar.isMobile = false
})

describe('⭐ gõ lúc dock đang thu gọn', () => {
  it('⭐ gửi tin thì MỞ dock — không để người dùng gõ vào khoảng không', () => {
    render(<AgentChatPanel />)

    send('link nào nhiều lượt nhất?')

    expect(setIsOpen).toHaveBeenCalledWith(true)
  })

  it('⭐ và tin vẫn được gửi — mở dock không được nuốt mất câu hỏi', () => {
    render(<AgentChatPanel />)

    send('link nào nhiều lượt nhất?')

    expect(sendMessage).toHaveBeenCalledTimes(1)
    expect(sendMessage.mock.calls[0][0]).toBe('link nào nhiều lượt nhất?')
  })

  /**
   * Thứ tự quan trọng: mở TRƯỚC khi gửi. Ngược lại thì khung tin nhắn gắn vào DOM sau khi phản hồi
   * đã bắt đầu chảy về, và những đoạn đầu tiên rơi vào một component chưa tồn tại.
   */
  it('mở dock TRƯỚC khi gửi, không phải sau', () => {
    const order: string[] = []
    setIsOpen.mockImplementation(() => order.push('open'))
    sendMessage.mockImplementation(() => order.push('send'))

    render(<AgentChatPanel />)
    send('xin chào')

    expect(order).toEqual(['open', 'send'])
  })
})

describe('danh sách tin nhắn theo đúng trạng thái dock', () => {
  it('thu gọn → không render MessageList (chính là nguyên nhân của lỗi)', () => {
    state.isOpen = false
    render(<AgentChatPanel />)

    expect(screen.queryByTestId('message-list')).toBeNull()
  })

  it('đang mở → có MessageList', () => {
    state.isOpen = true
    render(<AgentChatPanel />)

    expect(screen.getByTestId('message-list')).toBeDefined()
  })

  /**
   * Ô soạn hiện ở CẢ hai trạng thái — đó là chủ ý (gõ được ngay không cần mở trước), và cũng
   * chính là thứ khiến lỗi trên có đất sống. Giữ tính chất này, nhưng giờ nó an toàn vì gửi là mở.
   */
  it('ô soạn hiện ở cả hai trạng thái', () => {
    state.isOpen = false
    const { unmount } = render(<AgentChatPanel />)
    expect(screen.getByRole('textbox')).toBeDefined()
    unmount()

    state.isOpen = true
    render(<AgentChatPanel />)
    expect(screen.getByRole('textbox')).toBeDefined()
  })
})

/**
 * ⭐ Mép trái bám sidebar — chủ sản phẩm báo 2026-11-02: *"nó tràn màn hình bên dưới tôi thấy
 * xấu"*. Dock chỉ sống ở trang Link & Artifact, nên kéo nó qua cả dải sidebar làm nó trông như
 * một thanh của trình duyệt thay vì một phần của trang.
 *
 * Kiểm bằng BIẾN CSS chứ không bằng số pixel: `--sidebar-width` do `SidebarProvider` đặt, và
 * ghim con số ở đây sẽ đỏ một cách vô nghĩa vào ngày ai đó đổi bề rộng sidebar.
 */
describe('⭐ dock không tràn qua sidebar', () => {
  const dock = () => screen.getByRole('region') as HTMLElement

  it('⭐ sidebar mở → mép trái lùi đúng một bề rộng sidebar', () => {
    sidebar.state = 'expanded'
    render(<AgentChatPanel />)

    expect(dock().style.left).toBe('var(--sidebar-width)')
  })

  it('sidebar thu → lùi theo bề rộng icon, không giữ nguyên chỗ cũ', () => {
    sidebar.state = 'collapsed'
    render(<AgentChatPanel />)

    expect(dock().style.left).toBe('var(--sidebar-width-icon)')
  })

  /** Trên mobile sidebar là lớp phủ, không chiếm chỗ — chừa lề ở đây là bỏ phí bề ngang. */
  it('mobile → sát mép trái, vì sidebar lúc đó là lớp phủ', () => {
    sidebar.isMobile = true
    render(<AgentChatPanel />)

    expect(dock().style.left).toBe('0px')
  })

  it('KHÔNG còn `inset-x-0` — đó chính là thứ gây tràn', () => {
    render(<AgentChatPanel />)

    expect(dock().className).not.toContain('inset-x-0')
    expect(dock().className).toContain('right-0')
  })
})

/**
 * ⭐ Ba yêu cầu của chủ sản phẩm, 2026-11-02:
 *   1. thu gọn thì *"khung khoảng nhiêu đây thôi"* — tiêu đề + ô soạn, bỏ ba hàng gợi ý;
 *   2. *"khi bấm chat thì khung chat tự động bật reopen lên"*;
 *   3. *"cho kéo chuột chỉnh size phù hợp"*.
 */
describe('⭐ thu gọn gọn lại', () => {
  it('⭐ thu gọn → KHÔNG hiện chip gợi ý (đó là ~46px bị cắt)', () => {
    state.isOpen = false
    render(<AgentChatPanel />)

    expect(screen.queryByText('examples.one')).toBeNull()
  })

  it('mở → gợi ý trở lại, vì lúc đó người dùng đang nhìn hội thoại', () => {
    state.isOpen = true
    render(<AgentChatPanel />)

    expect(screen.getByText('examples.one')).toBeDefined()
  })

  /**
   * ⭐ KHÔNG ép chiều cao lúc thu gọn — để nội dung tự quyết, rồi dock đo mình và khai ra.
   *
   * Ép một con số là đúng cái đã hỏng: bỏ một hàng khỏi dock thì con số thành thừa chỗ, thêm một
   * hàng thì nó cắt mất ô gõ — chủ sản phẩm đã gặp đúng vế thứ hai.
   */
  it('⭐ thu gọn → KHÔNG ép chiều cao, để nội dung tự quyết', () => {
    state.isOpen = false
    render(<AgentChatPanel />)

    expect(screen.getByRole('region').style.height).toBe('')
  })

  it('đang mở → CÓ ép chiều cao, vì người dùng kéo được', () => {
    state.isOpen = true
    render(<AgentChatPanel />)

    expect(screen.getByRole('region').style.height).not.toBe('')
  })
})

describe('⭐ chạm ô gõ là mở', () => {
  it('⭐ focus vào ô gõ → mở dock, không phải đi tìm nút', () => {
    state.isOpen = false
    render(<AgentChatPanel />)

    fireEvent.focus(screen.getByRole('textbox'))

    expect(setIsOpen).toHaveBeenCalledWith(true)
  })

  it('focus KHÔNG gửi gì — mở ra là mở, không phải gửi', () => {
    state.isOpen = false
    render(<AgentChatPanel />)

    fireEvent.focus(screen.getByRole('textbox'))

    expect(sendMessage).not.toHaveBeenCalled()
  })
})

describe('⭐ kéo đổi chiều cao', () => {
  it('⭐ đang mở → có tay nắm kéo', () => {
    state.isOpen = true
    render(<AgentChatPanel />)

    expect(screen.getByRole('separator')).toBeDefined()
  })

  /** Thu gọn là chiều cao CỐ ĐỊNH theo yêu cầu — một tay nắm ở đó chỉ là chỗ bấm nhầm. */
  it('thu gọn → KHÔNG có tay nắm', () => {
    state.isOpen = false
    render(<AgentChatPanel />)

    expect(screen.queryByRole('separator')).toBeNull()
  })

  it('tay nắm tab tới được — không chỉ kéo bằng chuột', () => {
    state.isOpen = true
    render(<AgentChatPanel />)

    expect(screen.getByRole('separator').tabIndex).toBe(0)
  })
})
