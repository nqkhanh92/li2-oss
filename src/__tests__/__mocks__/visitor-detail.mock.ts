import type {
  SessionDetail,
  PageviewDetail,
  FunnelStep,
} from '@/ee/features/funnels/types'

export const mockSession: SessionDetail = {
  session_id: 'sess-abc-123',
  visitor_id: 'vis-xyz-789',
  browser: 'Chrome',
  browser_version: '121',
  os: 'macOS',
  os_version: '14',
  device_type: 'desktop',
  country: 'VN',
  region: 'Ho Chi Minh',
  city: 'Ho Chi Minh City',
  referrer_domain: 'google.com',
  started_at: '2026-02-14T10:30:00Z',
  ended_at: '2026-02-14T10:33:45Z',
  duration_ms: 225000,
  page_count: 5,
  entry_page: '/',
  exit_page: '/cart',
  is_bounce: false,
}

export const mockSessionMissingFields: SessionDetail = {
  session_id: 'sess-empty-456',
  visitor_id: 'vis-empty-012',
  browser: null,
  browser_version: null,
  os: null,
  os_version: null,
  device_type: null,
  country: null,
  region: null,
  city: null,
  referrer_domain: null,
  started_at: '2026-02-14T08:00:00Z',
  ended_at: null,
  duration_ms: 0,
  page_count: 1,
  entry_page: null,
  exit_page: null,
  is_bounce: true,
}

export const mockPageviews: PageviewDetail[] = [
  {
    id: 'pv-1',
    page_path: '/',
    page_url: 'https://example.com/',
    page_title: 'Home',
    search_query: null,
    event_name: null,
    tp_id: null,
    li2_cid: null,
    event_type: null,
    timestamp: '2026-02-14T10:30:00Z',
    time_on_page: 15000,
  },
  {
    id: 'pv-2',
    page_path: '/products',
    page_url: 'https://example.com/products',
    page_title: 'Products',
    search_query: null,
    event_name: null,
    tp_id: null,
    li2_cid: null,
    event_type: null,
    timestamp: '2026-02-14T10:30:15Z',
    time_on_page: 45000,
  },
  {
    id: 'pv-3',
    page_path: '/products/shoes',
    page_url: 'https://example.com/products/shoes',
    page_title: 'Running Shoes',
    search_query: null,
    event_name: null,
    tp_id: null,
    li2_cid: null,
    event_type: null,
    timestamp: '2026-02-14T10:31:00Z',
    time_on_page: 30000,
  },
  {
    id: 'pv-4',
    page_path: '/cart',
    page_url: 'https://example.com/cart',
    page_title: 'Shopping Cart',
    search_query: null,
    event_name: null,
    tp_id: null,
    li2_cid: null,
    event_type: null,
    timestamp: '2026-02-14T10:31:30Z',
    time_on_page: 20000,
  },
]

export const mockFunnelSteps: FunnelStep[] = [
  {
    id: 'step-1',
    funnel_id: 'funnel-1',
    position: 1,
    name: 'Products',
    pattern_type: 'page_path',
    condition: 'starts_with',
    pattern: '/products',
    is_required: true,
    event_name: null,
    created_at: '2026-02-10T00:00:00Z',
  },
  {
    id: 'step-2',
    funnel_id: 'funnel-1',
    position: 2,
    name: 'Cart',
    pattern_type: 'page_path',
    condition: 'contains',
    pattern: '/cart',
    is_required: true,
    event_name: null,
    created_at: '2026-02-10T00:00:00Z',
  },
  {
    id: 'step-3',
    funnel_id: 'funnel-1',
    position: 3,
    name: 'Checkout',
    pattern_type: 'page_path',
    condition: 'equals',
    pattern: '/checkout',
    is_required: true,
    event_name: null,
    created_at: '2026-02-10T00:00:00Z',
  },
]

/** Helper to create a minimal FunnelStep */
export function makeStep(
  overrides: Partial<FunnelStep> & { position: number; name: string }
): FunnelStep {
  return {
    id: `step-${overrides.position}`,
    funnel_id: 'funnel-1',
    pattern_type: 'page_path',
    condition: 'contains',
    pattern: '/',
    is_required: true,
    created_at: '2026-02-10T00:00:00Z',
    ...overrides,
    event_name: overrides.event_name ?? null,
  }
}

/** Helper to create a minimal PageviewDetail */
export function makePv(
  overrides: Partial<PageviewDetail> & { id: string; page_path: string }
): PageviewDetail {
  return {
    page_url: `https://example.com${overrides.page_path}`,
    page_title: null,
    search_query: null,
    timestamp: '2026-02-14T10:30:00Z',
    time_on_page: null,
    ...overrides,
    event_name: overrides.event_name ?? null,
    tp_id: overrides.tp_id ?? null,
    li2_cid: overrides.li2_cid ?? null,
    event_type: overrides.event_type ?? null,
  }
}
