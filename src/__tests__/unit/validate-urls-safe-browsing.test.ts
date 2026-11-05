import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

// server-utils pulls in modules that build a Redis client at import time; keep the test offline
vi.mock('@/infrastructure/cache/redis', () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}))

const logMock = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => logMock },
}))

const mocks = vi.hoisted(() => ({
  getDestinationBlacklist: vi.fn(),
  isBlacklisted: vi.fn(),
  checkUrlSafety: vi.fn(),
}))

vi.mock('@/core/services/app-settings.service', () => ({
  appSettingsService: { getDestinationBlacklist: mocks.getDestinationBlacklist },
}))

vi.mock('@/shared/lib/blacklist/domain-blacklist', () => ({
  isBlacklisted: mocks.isBlacklisted,
}))

vi.mock('@/shared/lib/blacklist/safe-browsing', () => ({
  checkUrlSafety: mocks.checkUrlSafety,
}))

import { validateUrls } from '@/shared/lib/server-utils'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'

describe('validateUrls — Safe Browsing layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDestinationBlacklist.mockResolvedValue([])
    mocks.isBlacklisted.mockResolvedValue(false)
  })

  it('should let a clean URL through', async () => {
    mocks.checkUrlSafety.mockResolvedValue({ safe: true, threatTypes: [] })

    await expect(validateUrls(['https://example.com'])).resolves.toBeUndefined()
    expect(logMock.warn).not.toHaveBeenCalled()
  })

  it('should throw a 400 unsafe_url error and log the threat types first', async () => {
    mocks.checkUrlSafety.mockResolvedValue({
      safe: false,
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING'],
    })

    const error = await validateUrls(['http://evil.example/malware.html']).catch((e) => e)

    expect(error).toBeInstanceOf(BadRequestError)
    expect(error.statusCode ?? error.status).toBe(400)
    expect(JSON.stringify(error)).toContain('common:messages.error.unsafe_url')

    expect(logMock.warn).toHaveBeenCalledTimes(1)
    expect(logMock.warn.mock.calls[0][0]).toEqual({
      url: 'http://evil.example/malware.html',
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING'],
    })
  })

  it('should not reach Safe Browsing when the URL is already on the regex blacklist', async () => {
    mocks.getDestinationBlacklist.mockResolvedValue(['evil\\.example'])

    await expect(validateUrls(['http://evil.example'])).rejects.toBeInstanceOf(BadRequestError)
    expect(mocks.checkUrlSafety).not.toHaveBeenCalled()
  })
})
