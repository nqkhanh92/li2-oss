/**
 * Ba flag ẩn tính năng trên prod: ROADMAP (Canny), SUPPORT_CHAT (Chatwoot), AI_CHAT (nút Hỏi AI).
 * Yêu cầu không chỉ là "ẩn nút" mà còn KHÔNG tải script bên thứ ba, nên test soi cả DOM script.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'

// Flag đọc từ env khi import module thật, nên mock để không phụ thuộc .env.local
const flags = { ROADMAP: false, SUPPORT_CHAT: false, AI_CHAT: false }

vi.mock('@/shared/constants/disabled-features', () => ({
  get disabledFeatures() {
    return flags
  },
  get ORG_HOME_SECTION() {
    return ''
  },
}))

// ── Mock phụ thuộc nặng của navbar / chatwoot ──

const isMobileMock = { value: false as boolean | undefined }
vi.mock('@/shared/hooks/use-mobile', () => ({
  useIsMobile: () => isMobileMock.value,
}))

vi.mock('@/shared/stores/locale.store', () => ({
  useLocaleStore: (selector: any) => selector({ locale: 'vi' }),
}))

vi.mock('lucide-react', () => {
  const icon = (name: string) => {
    const Icon = () => React.createElement('span', { 'data-testid': `icon-${name}` })
    Icon.displayName = `Icon-${name}`
    return Icon
  }
  return {
    AlignJustify: icon('align-justify'),
    ChevronDown: icon('chevron-down'),
    Globe: icon('globe'),
    KeyIcon: icon('key'),
    UsersRound: icon('users'),
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'vi' } }),
}))

vi.mock('next/link', () => ({
  default: ({ children }: any) => React.createElement('a', null, children),
}))

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => React.createElement('img', { alt }),
}))

vi.mock('@/shared/components/layout/navbar/user-nav', () => ({
  UserNav: () => React.createElement('div', { 'data-testid': 'user-nav' }),
}))

vi.mock('@/shared/components/layout/navbar/demo-banner', () => ({
  DemoBanner: () => null,
}))

vi.mock('@/shared/components/layout/sidebar/language-dropdown', () => ({
  LanguageNavInApp: () => React.createElement('div', { 'data-testid': 'language-nav' }),
}))

vi.mock('@/shared/components/layout/sidebar/organization-popover', () => ({
  OrganizationPopover: ({ children }: any) => React.createElement('div', null, children),
}))

vi.mock('@/features/notifications/components', () => ({
  NotificationBell: () => React.createElement('div', { 'data-testid': 'notification-bell' }),
}))

vi.mock('@/features/agent-chat/components', () => ({
  AgentChatTrigger: () => React.createElement('button', { 'data-testid': 'agent-chat-trigger' }),
  AgentChatPanel: () => React.createElement('div', { 'data-testid': 'agent-chat-panel' }),
}))

vi.mock('@/shared/stores/event-store', () => ({
  useEventStore: () => ({ setEvent: vi.fn() }),
}))

vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({
    organization: { id: 'org-1', name: 'Org 1' },
    isOrgOwner: true,
  }),
}))

// ── Mock phụ thuộc của CannyProvider ──

vi.mock('@/shared/hooks/use-canny-sso', () => ({
  useCannySso: ({ enabled = true }: { enabled?: boolean } = {}) => {
    cannySsoCalls.push(enabled)
    return { ssoToken: null, isLoading: false, error: null, refetch: vi.fn() }
  },
}))

const cannySsoCalls: boolean[] = []

vi.mock('@/shared/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => React.createElement('div', null, children),
  DialogContent: ({ children }: any) => React.createElement('div', null, children),
}))

vi.mock('@/shared/components/customize/skeleton-card', () => ({
  SkeletonCard: () => null,
}))

import { ChatWoot } from '@/shared/providers/chat-woot'
import { Navbar } from '@/shared/components/layout/navbar/navbar'
import { CannyProvider } from '@/shared/providers/canny-provider'

const thirdPartyScripts = (needle: string) =>
  Array.from(document.querySelectorAll('script')).filter((s) => s.src.includes(needle))

beforeEach(() => {
  flags.ROADMAP = false
  flags.SUPPORT_CHAT = false
  flags.AI_CHAT = false
  isMobileMock.value = false
  cannySsoCalls.length = 0
  // Dọn script của test trước. Phải ở beforeEach, không phải afterEach: cleanup của React
  // Testing Library chạy sau hook trong file này và sẽ removeChild chính script đó.
  document.querySelectorAll('script').forEach((s) => s.remove())
})

describe('NEXT_PUBLIC_DISABLE_SUPPORT_CHAT', () => {
  it('flag tắt: chèn script SDK Chatwoot', () => {
    const { container } = render(<ChatWoot />)
    expect(container.innerHTML).toBe('')
    expect(thirdPartyScripts('chatwoot.li2.ai')).toHaveLength(1)
  })

  it('flag bật: không render gì và không chèn script Chatwoot', () => {
    flags.SUPPORT_CHAT = true
    const { container } = render(<ChatWoot />)
    expect(container.innerHTML).toBe('')
    expect(thirdPartyScripts('chatwoot.li2.ai')).toHaveLength(0)
  })
})

describe('NEXT_PUBLIC_DISABLE_AI_CHAT', () => {
  it('flag tắt: navbar có nút Hỏi AI', () => {
    render(<Navbar />)
    expect(screen.getByTestId('agent-chat-trigger')).toBeTruthy()
  })

  it('flag bật: navbar không render nút Hỏi AI', () => {
    flags.AI_CHAT = true
    render(<Navbar />)
    expect(screen.queryByTestId('agent-chat-trigger')).toBeNull()
    // Các mục khác của navbar vẫn còn — flag chỉ ẩn đúng một nút
    expect(screen.getByTestId('notification-bell')).toBeTruthy()
  })
})

describe('NEXT_PUBLIC_DISABLE_ROADMAP', () => {
  it('flag tắt: tải SDK Canny và lấy SSO token', () => {
    render(
      <CannyProvider>
        <div />
      </CannyProvider>
    )
    expect(thirdPartyScripts('sdk.canny.io')).toHaveLength(1)
    expect(cannySsoCalls).toContain(true)
  })

  it('flag bật: không tải SDK Canny và không gọi SSO', () => {
    flags.ROADMAP = true
    render(
      <CannyProvider>
        <div />
      </CannyProvider>
    )
    expect(thirdPartyScripts('sdk.canny.io')).toHaveLength(0)
    expect(cannySsoCalls.every((enabled) => enabled === false)).toBe(true)
  })
})
