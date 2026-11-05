import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DropOffInsight } from '@/ee/features/funnels/components/drop-off-insight'
import {
  mockSteps,
  mockTwoStepSteps,
  mockLowDropOffSteps,
} from '../../__mocks__/funnel-report.mock'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const funnelsEn = require('../../../../public/lang/en/funnels.json')
function getNestedVal(obj: Record<string, any>, path: string): string {
  const val = path.split('.').reduce((o: any, k) => o?.[k], obj)
  return typeof val === 'string' ? val : path
}
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const val = getNestedVal(funnelsEn, key)
      if (!params) return val
      return val.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(params[k] ?? ''))
    },
  }),
}))

describe('DropOffInsight', () => {
  it('identifies step with highest drop-off rate', () => {
    render(<DropOffInsight steps={mockSteps} />)

    // Step 3 (Product details) has highest drop-off at 52.3%
    expect(screen.getByText('Biggest Drop-off')).toBeDefined()
    expect(screen.getByText(/Product details/)).toBeDefined()
    expect(screen.getByText(/52.3%/)).toBeDefined()
  })

  it('shows step transition context', () => {
    render(<DropOffInsight steps={mockSteps} />)

    // Should show "Step 3: Product details → Checkout"
    expect(screen.getByText(/Step 3/)).toBeDefined()
    expect(screen.getByText(/Checkout/)).toBeDefined()
  })

  it('shows formatted drop-off count', () => {
    render(<DropOffInsight steps={mockSteps} />)

    // 4600 → "4.6k visitors dropped off"
    expect(screen.getByText(/4.6k visitors dropped off/)).toBeDefined()
  })

  it('shows Critical severity for high drop-off', () => {
    render(<DropOffInsight steps={mockSteps} />)

    // 52.3% > 40% → Critical
    expect(screen.getByText('Critical')).toBeDefined()
  })

  it('shows Low severity for low drop-off rates', () => {
    render(<DropOffInsight steps={mockLowDropOffSteps} />)

    // Step 1 has 10% drop-off (highest, but still < 20%) → Low
    expect(screen.getByText('Low')).toBeDefined()
  })

  it('returns null when only one step', () => {
    const singleStep = [mockSteps[0]]
    const { container } = render(<DropOffInsight steps={singleStep} />)

    // Single step = no drop-off to show (last step is excluded)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when all steps have zero visits', () => {
    const zeroSteps = mockSteps.map((s) => ({
      ...s,
      visits: 0,
      drop_off_rate: 0,
    }))
    const { container } = render(<DropOffInsight steps={zeroSteps} />)

    expect(container.innerHTML).toBe('')
  })

  it('handles two-step funnel (single candidate)', () => {
    render(<DropOffInsight steps={mockTwoStepSteps} />)

    // Only Step 1 is a candidate — 60% drop-off → Critical
    expect(screen.getByText(/Page A/)).toBeDefined()
    expect(screen.getByText('Critical')).toBeDefined()
    expect(screen.getByText(/60.0%/)).toBeDefined()
  })
})
