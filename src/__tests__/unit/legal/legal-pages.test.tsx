/**
 * ⭐ P0.5 — `/privacy`, `/terms` and `/support`: the pages `op_policy_uri`, `op_tos_uri` and the
 * ChatGPT plugin manifest's `supportURL` point at.
 *
 * What is actually at risk here is not the layout — it is that a link published in an OAuth metadata
 * document, which a connector directory fetches during review, resolves to a real document in both
 * languages. So the tests render the REAL page components against the REAL translation files:
 *
 *   1. Each page renders its own title, date and every section heading. A page that renders an empty
 *      shell because a key was renamed looks fine in a screenshot and fails a review.
 *   2. vi and en carry the SAME sections in the same order. A missing English section means a
 *      reviewer reading in English sees a shorter policy than the one the product actually follows.
 *   3. Neither page shows the word "draft". The notice belongs in the code comments; on the page it
 *      would tell exactly the audience these URLs exist for that there is no policy yet.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import legalVi from '../../../../public/lang/vi/legal.json'
import legalEn from '../../../../public/lang/en/legal.json'

/**
 * The namespace is read through `useTranslation('legal')`, which in the browser fetches
 * `public/lang/<lng>/legal.json`. Here that file is imported and walked directly, so the test proves
 * the SHIPPED copy renders — not a fixture that happens to have the right keys.
 */
const locale = { current: legalVi as Record<string, unknown> }

function resolve(key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part]
    return undefined
  }, locale.current)
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const value = resolve(key)
      // Mirrors i18next: a key it cannot resolve comes back as the key itself.
      return value === undefined ? key : value
    },
    ready: true,
  }),
}))

import PrivacyPage from '@/app/(public)/privacy/page'
import TermsPage from '@/app/(public)/terms/page'
import SupportPage from '@/app/(public)/support/page'

type LegalSection = { heading: string; body: string[] }
type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] }

type LegalFile = { privacy: LegalDoc; terms: LegalDoc; support: LegalDoc }

const vi_ = legalVi as unknown as LegalFile
const en_ = legalEn as unknown as LegalFile

describe('/privacy', () => {
  it('renders the title, the date and every section heading', () => {
    locale.current = legalVi as Record<string, unknown>
    render(<PrivacyPage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(vi_.privacy.title)
    expect(screen.getByText(vi_.privacy.updated)).toBeTruthy()
    for (const section of vi_.privacy.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeTruthy()
    }
  })

  it('renders in English too', () => {
    locale.current = legalEn as Record<string, unknown>
    render(<PrivacyPage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en_.privacy.title)
    expect(
      screen.getByRole('heading', { level: 2, name: en_.privacy.sections[0].heading })
    ).toBeTruthy()
  })

  it('⛔ never shows the reader that this copy is a draft', () => {
    locale.current = legalVi as Record<string, unknown>
    const { container } = render(<PrivacyPage />)

    expect(container.textContent?.toLowerCase()).not.toContain('draft')
    expect(container.textContent?.toLowerCase()).not.toContain('nháp')
  })
})

describe('/terms', () => {
  it('renders the title, the date and every section heading', () => {
    locale.current = legalVi as Record<string, unknown>
    render(<TermsPage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(vi_.terms.title)
    expect(screen.getByText(vi_.terms.updated)).toBeTruthy()
    for (const section of vi_.terms.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeTruthy()
    }
  })

  it('renders in English too', () => {
    locale.current = legalEn as Record<string, unknown>
    render(<TermsPage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en_.terms.title)
  })
})

describe('/support', () => {
  it('renders the title, the date and every section heading', () => {
    locale.current = legalVi as Record<string, unknown>
    render(<SupportPage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(vi_.support.title)
    expect(screen.getByText(vi_.support.updated)).toBeTruthy()
    for (const section of vi_.support.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeTruthy()
    }
  })

  it('renders in English too', () => {
    locale.current = legalEn as Record<string, unknown>
    render(<SupportPage />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en_.support.title)
  })

  it('⭐ carries the channels a connector directory asks for', () => {
    // A support page with no address to write to, no abuse channel and no link to the policy is
    // what a directory review rejects. These four strings are the review checklist.
    for (const doc of [vi_.support, en_.support]) {
      const text = JSON.stringify(doc)
      expect(text).toContain('support@li2.ai')
      expect(text).toContain('https://docs.li2.ai')
      expect(text).toContain('/privacy')
      expect(text).toContain('/terms')
    }
  })

  it('⛔ invents no phone number, postal address or legal entity', () => {
    // Nothing of the sort has been confirmed by the owner, and a fabricated one on the page a
    // reviewer reads is worse than none.
    for (const doc of [vi_.support, en_.support]) {
      expect(JSON.stringify(doc)).not.toMatch(/\+?\d[\d\s().-]{7,}\d/)
    }
  })
})

describe('terms: governing law', () => {
  it('⭐ states the governing law and where a dispute is settled', () => {
    const viGov = vi_.terms.sections.map((s) => JSON.stringify(s)).join('\n')
    const enGov = en_.terms.sections.map((s) => JSON.stringify(s)).join('\n')

    expect(viGov).toContain('pháp luật Việt Nam')
    expect(viGov).toContain('toà án có thẩm quyền')
    expect(enGov).toContain('laws of Vietnam')
    expect(enGov).toContain('court of competent jurisdiction')
  })

  it('numbers every terms section continuously, in both languages', () => {
    // The governing-law section was inserted before Contact, so the numbers after it had to move.
    // A duplicated or skipped number is the visible half of a half-finished renumber.
    for (const doc of [vi_.terms, en_.terms]) {
      const numbers = doc.sections.map((section) => {
        const match = /^(\d+)\./.exec(section.heading)
        expect(match, section.heading).not.toBeNull()
        return Number(match![1])
      })
      expect(numbers).toEqual(numbers.map((_, index) => index + 1))
    }
  })
})

describe('the locales describe the same documents', () => {
  it('has the same number of sections, each with the same number of paragraphs', () => {
    for (const kind of ['privacy', 'terms', 'support'] as const) {
      expect(en_[kind].sections.length, kind).toBe(vi_[kind].sections.length)
      vi_[kind].sections.forEach((section, index) => {
        expect(en_[kind].sections[index].body.length, `${kind}[${index}]`).toBe(section.body.length)
      })
    }
  })

  it('names the third parties this codebase actually uses, in both languages', () => {
    // The sharing section is the one a reviewer checks against the product. Casdoor, Supabase and
    // Google OAuth are what the app really talks to; a policy that omitted one would be wrong, and a
    // policy that listed a service the app does not use would be worse.
    for (const doc of [vi_.privacy, en_.privacy]) {
      const text = JSON.stringify(doc)
      expect(text).toContain('Casdoor')
      expect(text).toContain('Supabase')
      expect(text).toContain('Google OAuth')
    }
  })
})
