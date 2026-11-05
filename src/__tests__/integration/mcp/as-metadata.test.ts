/**
 * ⭐ P0.5 — RFC 8414 Authorization Server Metadata: the policy and terms links.
 *
 * `op_policy_uri` and `op_tos_uri` are optional in the RFC and required in practice: a client that
 * registers through CIMD never fills in a registration form, so this document is the ONLY place a
 * human-facing policy and terms link can reach it, and a directory reviewer who cannot fetch them
 * has no way to see what the connector does with a user's data.
 *
 * Both are asserted to be built FROM THE ISSUER rather than from a li2.ai literal. Self-hosted
 * instances serve this same route, and a hard-coded link would point their users at someone else's
 * policy — which is worse than no link at all, because it reads as authoritative.
 */
import { describe, it, expect, beforeEach } from 'vitest'

const ISSUER = 'https://app.li2.test'
process.env.NEXT_PUBLIC_APP_BASE_URL = ISSUER

import { GET } from '@/app/.well-known/oauth-authorization-server/route'

type Metadata = Record<string, unknown>

async function metadata(): Promise<Metadata> {
  const response = await GET()
  expect(response.status).toBe(200)
  return (await response.json()) as Metadata
}

describe('.well-known/oauth-authorization-server — policy and terms (P0.5)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_BASE_URL = ISSUER
  })

  it('⭐ publishes op_policy_uri and op_tos_uri', async () => {
    const body = await metadata()

    expect(body.op_policy_uri).toBe(`${ISSUER}/privacy`)
    expect(body.op_tos_uri).toBe(`${ISSUER}/terms`)
  })

  it('keeps service_documentation — the three are different promises', async () => {
    // Developer docs are not a privacy policy and not terms of service; a directory review asks for
    // all three and treats one standing in for another as missing.
    const body = await metadata()

    expect(body.service_documentation).toBe('https://docs.li2.ai')
  })

  it('derives both from the issuer, so a self-hosted instance links to its OWN pages', async () => {
    process.env.NEXT_PUBLIC_APP_BASE_URL = 'https://app.example.com'
    const body = await metadata()

    expect(body.op_policy_uri).toBe('https://app.example.com/privacy')
    expect(body.op_tos_uri).toBe('https://app.example.com/terms')
    expect(body.issuer).toBe('https://app.example.com')
  })
})
