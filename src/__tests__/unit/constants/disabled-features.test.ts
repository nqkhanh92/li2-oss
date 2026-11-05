import { afterEach, describe, expect, it, vi } from 'vitest'

const FLAG_ENVS = [
  'NEXT_PUBLIC_DISABLE_OVERVIEW_GROUP',
  'NEXT_PUBLIC_DISABLE_ONBOARDING',
  'NEXT_PUBLIC_DISABLE_DASHBOARDS',
  'NEXT_PUBLIC_DISABLE_CONVERSIONS',
  'NEXT_PUBLIC_DISABLE_CUSTOMERS',
  'NEXT_PUBLIC_DISABLE_BEHAVIOR_ANALYTICS',
  'NEXT_PUBLIC_DISABLE_ROADMAP',
  'NEXT_PUBLIC_DISABLE_SUPPORT_CHAT',
  'NEXT_PUBLIC_DISABLE_AI_CHAT',
] as const

const FLAG_KEYS = [
  'OVERVIEW_GROUP',
  'ONBOARDING',
  'DASHBOARDS',
  'CONVERSIONS',
  'CUSTOMERS',
  'BEHAVIOR_ANALYTICS',
  'ROADMAP',
  'SUPPORT_CHAT',
  'AI_CHAT',
] as const

async function loadModule(env: Record<string, string | undefined>) {
  for (const key of FLAG_ENVS) vi.stubEnv(key, '')
  vi.stubEnv('NEXT_PUBLIC_ORG_HOME_SECTION', '')
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value as string)
  vi.resetModules()
  return import('@/shared/constants/disabled-features')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('disabledFeatures', () => {
  it('mặc định tất cả flag mới đều false', async () => {
    const { disabledFeatures } = await loadModule({})
    for (const key of FLAG_KEYS) expect(disabledFeatures[key]).toBe(false)
  })

  it('đọc đúng từng biến NEXT_PUBLIC_DISABLE_*', async () => {
    for (let i = 0; i < FLAG_ENVS.length; i++) {
      const { disabledFeatures } = await loadModule({ [FLAG_ENVS[i]]: 'true' })
      expect(disabledFeatures[FLAG_KEYS[i]]).toBe(true)
      const others = FLAG_KEYS.filter((_, j) => j !== i)
      for (const key of others) expect(disabledFeatures[key]).toBe(false)
    }
  })

  it('không phân biệt hoa thường và bỏ qua giá trị khác true', async () => {
    const onTrue = await loadModule({ NEXT_PUBLIC_DISABLE_CUSTOMERS: 'TRUE' })
    expect(onTrue.disabledFeatures.CUSTOMERS).toBe(true)
    const onOne = await loadModule({ NEXT_PUBLIC_DISABLE_CUSTOMERS: '1' })
    expect(onOne.disabledFeatures.CUSTOMERS).toBe(false)
  })
})

describe('ORG_HOME_SECTION', () => {
  it('mặc định là chuỗi rỗng', async () => {
    const { ORG_HOME_SECTION } = await loadModule({})
    expect(ORG_HOME_SECTION).toBe('')
  })

  it('đọc và trim giá trị từ env', async () => {
    const { ORG_HOME_SECTION } = await loadModule({
      NEXT_PUBLIC_ORG_HOME_SECTION: '  short-links  ',
    })
    expect(ORG_HOME_SECTION).toBe('short-links')
  })
})
