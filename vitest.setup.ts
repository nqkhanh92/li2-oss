import { vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Ensure React development build is used (required for act() in component tests)
process.env.NODE_ENV = 'test'

// Auto-cleanup DOM after each test (required since globals: true is not set)
afterEach(() => {
  cleanup()
})

// jsdom does not implement ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock environment variables that are required at module load time
process.env.NEXT_PUBLIC_CASDOOR_BASE64_CERT = Buffer.from('mock-cert').toString('base64')
process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID = 'mock-client-id'
process.env.NEXT_PUBLIC_CASDOOR_ORG_NAME = 'mock-org'
process.env.CASDOOR_CLIENT_SECRET = 'mock-secret'
process.env.NEXT_PUBLIC_CASDOOR_APP_URL = 'http://localhost:8000'
process.env.NEXT_PUBLIC_CASDOOR_APP_NAME = 'mock-app'

// Mock Supabase environment variables
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_KEY = 'mock-service-key'
process.env.SUPABASE_ANON_KEY = 'mock-anon-key'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key'

// ⚠ Phải đặt ở ĐÂY chứ không dựa vào `.env.local` của máy lập trình. `a-route.test.ts:852`
// cần biến này để chứng minh nút đăng nhập là URL tuyệt đối, và trên máy có `.env.local` thì
// nó có sẵn — nên test xanh ở đây mà ĐỎ trên một bản clone sạch. Đúng loại lỗi chỉ CI hoặc
// người mới clone mới gặp.
process.env.NEXT_PUBLIC_APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000'

// Mock Redis environment variables
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = '6379'

/**
 * jsdom không cài `matchMedia`, mà mọi component đi qua `useIsMobile` đều gọi nó — thiếu thì
 * component ném trước khi render được dòng nào. Đặt ở đây thay vì từng file test, vì đây là
 * khoảng trống của môi trường chứ không phải nhu cầu riêng của một bài test.
 */
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}
