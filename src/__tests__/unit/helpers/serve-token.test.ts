import { describe, it, expect } from 'vitest'
import {
  generateServeToken,
  SERVE_TOKEN_LENGTH,
  SERVE_TOKEN_PATTERN,
} from '@/core/helpers/serve-token'

describe('generateServeToken', () => {
  it('produces a 16-char lowercase alphanumeric token by default', () => {
    const token = generateServeToken()
    expect(token).toHaveLength(SERVE_TOKEN_LENGTH)
    expect(SERVE_TOKEN_PATTERN.test(token)).toBe(true)
  })

  it('honours an explicit length', () => {
    expect(generateServeToken(8)).toHaveLength(8)
    expect(generateServeToken(32)).toHaveLength(32)
  })

  it('does not repeat across many draws', () => {
    const tokens = new Set(Array.from({ length: 2000 }, () => generateServeToken()))
    expect(tokens.size).toBe(2000)
  })

  it('uses the whole alphabet — the rejection sampling must not starve any symbol', () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateServeToken()).join(''))
    expect(seen.size).toBe(36)
  })
})

describe('SERVE_TOKEN_PATTERN', () => {
  it('rejects tokens that are not exactly 16 lowercase alphanumerics', () => {
    expect(SERVE_TOKEN_PATTERN.test('ABCDEFGHIJKLMNOP')).toBe(false)
    expect(SERVE_TOKEN_PATTERN.test('abcdefghijklmno')).toBe(false)
    expect(SERVE_TOKEN_PATTERN.test('abcdefghijklmnopq')).toBe(false)
    expect(SERVE_TOKEN_PATTERN.test('../../../etc/pas')).toBe(false)
    expect(SERVE_TOKEN_PATTERN.test('abcdef0123456789')).toBe(true)
  })
})
