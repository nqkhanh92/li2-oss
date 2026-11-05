import { describe, it, expect } from 'vitest'
import {
  parseTargetingToForm,
  serializeFormToTargeting,
} from '@/features/short-links/components/smart-targeting/legacy-targets'

const single = (ruleType: string, config: unknown, destination: string) => ({
  type: 'single',
  ruleType,
  config,
  destination,
})

const block = (operator: 'and' | 'or', rules: unknown[], destination: string) => ({
  type: 'block',
  operator,
  rules,
  destination,
})

describe('parseTargetingToForm', () => {
  it('returns empty form for empty input', () => {
    const r = parseTargetingToForm(null)
    expect(r.dropped).toEqual([])
    expect(r.decomposed).toBe(0)
    expect(r.form.devices).toEqual({ android: '', ios: '' })
    expect(r.form.countries).toEqual([])
  })

  it('preserves a single Android device rule', () => {
    const r = parseTargetingToForm({
      targets: [single('device', { values: ['android'] }, 'https://play.example')],
    } as never)
    expect(r.form.devices.android).toBe('https://play.example')
    expect(r.form.devices.ios).toBe('')
    expect(r.dropped).toEqual([])
    expect(r.decomposed).toBe(0)
  })

  it('drops a duplicate device with the same axis (first wins)', () => {
    const r = parseTargetingToForm({
      targets: [
        single('device', { values: ['android'] }, 'https://first.example'),
        single('device', { values: ['android'] }, 'https://second.example'),
      ],
    } as never)
    expect(r.form.devices.android).toBe('https://first.example')
    expect(r.dropped).toHaveLength(1)
    expect(r.dropped[0].reason).toBe('duplicate_device')
  })

  it('flattens BLOCK with one sub-rule (covers s.li2.link/6LBlt)', () => {
    const r = parseTargetingToForm({
      targets: [
        block('and', [{ ruleType: 'device', config: { values: ['ios'] } }], 'https://app.example'),
      ],
    } as never)
    expect(r.form.devices.ios).toBe('https://app.example')
    expect(r.dropped).toEqual([])
    expect(r.decomposed).toBe(1)
  })

  it('decomposes BLOCK·OR cross-axis country/device → split (covers jvke-golden-hour)', () => {
    const r = parseTargetingToForm({
      targets: [
        block(
          'or',
          [
            { ruleType: 'geography', config: { type: 'country', values: ['US'] } },
            { ruleType: 'device', config: { values: ['ios'] } },
          ],
          'https://shared.example'
        ),
      ],
    } as never)
    expect(r.form.devices.ios).toBe('https://shared.example')
    expect(r.form.countries).toHaveLength(1)
    expect(r.form.countries[0].values).toEqual(['US'])
    expect(r.form.countries[0].destination).toBe('https://shared.example')
    expect(r.dropped).toEqual([])
    expect(r.decomposed).toBe(1)
  })

  it('drops BLOCK·AND multi-axis (covers 6LB9S)', () => {
    const r = parseTargetingToForm({
      targets: [
        block(
          'and',
          [
            { ruleType: 'device', config: { values: ['android'] } },
            { ruleType: 'geography', config: { type: 'country', values: ['AX'] } },
            { ruleType: 'interaction', config: { values: ['QR'] } },
          ],
          'https://chatgpt.example'
        ),
      ],
    } as never)
    expect(r.form.devices.android).toBe('')
    expect(r.form.countries).toHaveLength(0)
    expect(r.dropped).toHaveLength(1)
    expect(r.dropped[0].reason).toBe('cross_axis_and')
  })

  it('merges BLOCK·OR same-axis country values', () => {
    const r = parseTargetingToForm({
      targets: [
        block(
          'or',
          [
            { ruleType: 'geography', config: { type: 'country', values: ['US'] } },
            { ruleType: 'geography', config: { type: 'country', values: ['VN'] } },
          ],
          'https://multi.example'
        ),
      ],
    } as never)
    expect(r.form.countries).toHaveLength(1)
    expect(r.form.countries[0].values).toEqual(['US', 'VN'])
    expect(r.decomposed).toBe(1)
  })

  it('splits OR device per value (B3) — does not merge into one rule', () => {
    const r = parseTargetingToForm({
      targets: [
        block(
          'or',
          [
            { ruleType: 'device', config: { values: ['ios'] } },
            { ruleType: 'device', config: { values: ['android'] } },
          ],
          'https://both-stores.example'
        ),
      ],
    } as never)
    expect(r.form.devices.ios).toBe('https://both-stores.example')
    expect(r.form.devices.android).toBe('https://both-stores.example')
  })

  it('records partial OR drop when an unsupported branch is lost', () => {
    const r = parseTargetingToForm({
      targets: [
        block(
          'or',
          [
            { ruleType: 'geography', config: { type: 'country', values: ['US'] } },
            { ruleType: 'device', config: { values: ['ios'] } },
            { ruleType: 'interaction', config: { values: ['QR'] } },
          ],
          'https://mixed.example'
        ),
      ],
    } as never)
    expect(r.form.devices.ios).toBe('https://mixed.example')
    expect(r.form.countries[0].values).toEqual(['US'])
    expect(r.dropped.some((d) => d.reason === 'unsupported_interaction')).toBe(true)
  })

  it('drops empty-rules BLOCK without crashing', () => {
    const r = parseTargetingToForm({
      targets: [block('and', [], 'https://hijack.example')],
    } as never)
    expect(r.dropped).toHaveLength(1)
    expect(r.dropped[0].reason).toBe('cross_axis_and')
  })

  it('drops SINGLE interaction', () => {
    const r = parseTargetingToForm({
      targets: [single('interaction', { values: ['QR'] }, 'https://qr.example')],
    } as never)
    expect(r.dropped).toHaveLength(1)
    expect(r.dropped[0].reason).toBe('unsupported_interaction')
  })

  it('drops SINGLE continent and city', () => {
    const r = parseTargetingToForm({
      targets: [
        single('geography', { type: 'continent', values: ['AS'] }, 'https://asia.example'),
        single('geography', { type: 'city', values: ['California'] }, 'https://ca.example'),
      ],
    } as never)
    expect(r.dropped.map((d) => d.reason).sort()).toEqual(['unsupported_city', 'unsupported_continent'])
  })

  it('flags malformed shapes', () => {
    const r = parseTargetingToForm({
      targets: [
        // missing ruleType
        { type: 'single', config: { values: ['ios'] }, destination: 'https://x.example' },
        // null config
        single('device', null, 'https://y.example'),
      ],
    } as never)
    expect(r.dropped.length).toBeGreaterThanOrEqual(1)
    expect(r.dropped.some((d) => d.reason === 'malformed')).toBe(true)
  })
})

describe('serializeFormToTargeting', () => {
  it('emits Android then iOS then Country in user-visible order (D3)', () => {
    const wire = serializeFormToTargeting({
      devices: { android: 'https://play.example', ios: 'https://apple.example' },
      countries: [
        { id: '1', values: ['VN', 'TH'], destination: 'https://asia.example' },
        { id: '2', values: ['US'], destination: 'https://us.example' },
      ],
    })
    const targets = wire.targets ?? []
    expect(targets).toHaveLength(4)
    expect(targets[0]).toMatchObject({ ruleType: 'device', config: { values: ['android'] } })
    expect(targets[1]).toMatchObject({ ruleType: 'device', config: { values: ['ios'] } })
    expect(targets[2]).toMatchObject({
      ruleType: 'geography',
      config: { type: 'country', values: ['VN', 'TH'] },
      destination: 'https://asia.example',
    })
    expect(targets[3]).toMatchObject({
      ruleType: 'geography',
      config: { type: 'country', values: ['US'] },
      destination: 'https://us.example',
    })
  })

  it('skips empty fields', () => {
    const wire = serializeFormToTargeting({
      devices: { android: '', ios: '' },
      countries: [{ id: '1', values: [], destination: 'https://x.example' }],
    })
    expect(wire.targets ?? []).toHaveLength(0)
  })
})

describe('round-trip', () => {
  it('preserves supported shapes through parse→serialize', () => {
    const original = {
      targets: [
        single('device', { values: ['android'] }, 'https://play.example'),
        single('device', { values: ['ios'] }, 'https://apple.example'),
        single('geography', { type: 'country', values: ['VN'] }, 'https://vi.example'),
      ],
    }
    const { form } = parseTargetingToForm(original as never)
    const wire = serializeFormToTargeting(form)
    const targets = wire.targets ?? []
    expect(targets).toHaveLength(3)
    expect(targets[0]).toMatchObject({ config: { values: ['android'] } })
    expect(targets[1]).toMatchObject({ config: { values: ['ios'] } })
    expect(targets[2]).toMatchObject({
      config: { type: 'country', values: ['VN'] },
      destination: 'https://vi.example',
    })
  })
})
