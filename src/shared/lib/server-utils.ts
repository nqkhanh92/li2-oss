import { formToJSON } from 'axios'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { isBlacklisted } from './blacklist/domain-blacklist'
import { checkUrlSafety } from './blacklist/safe-browsing'
import { BadRequestError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'

const urlCheckLog = logger.child({ module: 'url-validation' })

const THREAT_TYPE_LABELS: Record<string, string> = {
  MALWARE: 'Malware',
  SOCIAL_ENGINEERING: 'Phishing',
  UNWANTED_SOFTWARE: 'Unwanted Software',
  POTENTIALLY_HARMFUL_APPLICATION: 'Harmful Application',
}
import { getDomain } from 'tldts'
import { appSettingsService } from '@/core/services/app-settings.service'

/**
 * ⚠️ SHARED CODE. `/invitation`, the Canny SSO hop and the MCP consent screen all come through here.
 *
 * ★ THE TWO ENCODINGS BELOW ARE COUPLED. CHANGE BOTH OR NEITHER.
 *
 * This used to be two compensating bugs. `redirect_to` was double-encoded
 * (`searchParams.set('redirect_to', encodeURIComponent(x))` — `set` already percent-encodes), and
 * `redirect_uri` was interpolated RAW into the Casdoor URL, so Casdoor's own query parse supplied a
 * third decode that cancelled the extra one exactly. It worked, by coincidence, for every input.
 *
 * That made it a trap: fixing either half alone unbalances the chain and breaks any `redirect_to`
 * carrying two or more query parameters — which is precisely what the MCP consent screen carries.
 * Both were corrected together, so the rewrite is a functional no-op (verified across a bare path, a
 * path with one param, a path with two, and the Canny absolute URL, simulating all three decode
 * hops). The raw interpolation was independently worth removing: any `&` in `redirect_uri` would
 * have terminated the parameter early.
 *
 * Now: `set` is the only encoder at each level, and the nesting is one encode per decode —
 * `redirect_to` inside `redirect_uri`, unwrapped by Casdoor and then by `/auth/callback`.
 */
const buildCasdoorAuthorizeUrl = (path: string, redirect_to?: string) => {
  const callbackUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_BASE_URL)
  if (redirect_to) {
    callbackUrl.searchParams.set('redirect_to', redirect_to)
  }

  const url = new URL(path, process.env.NEXT_PUBLIC_CASDOOR_APP_URL)
  url.searchParams.set('client_id', process.env.NEXT_PUBLIC_CASDOOR_CLIENT_ID ?? '')
  url.searchParams.set('redirect_uri', callbackUrl.toString())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid')
  url.searchParams.set('state', 'STATE')
  return url.toString()
}

export const getCasdoorLoginUrl = (redirect_to?: string) =>
  buildCasdoorAuthorizeUrl('/login/oauth/authorize', redirect_to)

export const getCasdoorRegisterUrl = (redirect_to?: string) =>
  buildCasdoorAuthorizeUrl('/signup/oauth/authorize', redirect_to)

export const getRequestPayload = async (req: NextRequest) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await req.formData()
      return formToJSON(formData)
    }
    if (req.headers.get('content-type')?.includes('application/json')) {
      const json = await req.json()
      return json
    }
    return {}
  }
  if (req.method === 'GET') {
    const params = req.nextUrl.searchParams
    return Object.fromEntries(params)
  }
}

export const getRequestOrigin = () => {
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  return `${protocol}://${host}`
}

export const validateUrls = async (urls: string[]) => {
  const destinationBlacklist = await appSettingsService.getDestinationBlacklist()

  for (const url of urls) {
    // Check admin-configured destination regex blacklist
    for (const pattern of destinationBlacklist) {
      try {
        if (new RegExp(pattern).test(url)) {
          throw new BadRequestError('URL is blacklisted', {
            key: 'common:messages.error.blacklisted',
            params: { url },
          })
        }
      } catch (e) {
        if (e instanceof BadRequestError) throw e
        // invalid regex in config — skip silently
      }
    }

    // Check domain bloom filter blacklist
    const domain = getDomain(url)
    if (domain) {
      const blacklisted = await isBlacklisted(domain)
      if (blacklisted) {
        throw new BadRequestError('URL is blacklisted', {
          key: 'common:messages.error.blacklisted',
          params: { url },
        })
      }
    }

    // Layer 3: Google Safe Browsing API v5.
    // Fail-open by design — see the rationale on checkUrlsSafety(). With no API key configured this
    // call always returns safe, which is why that module warns once per process.
    const safetyResult = await checkUrlSafety(url)
    if (!safetyResult.safe) {
      const threatLabels = safetyResult.threatTypes.map(
        (t) => THREAT_TYPE_LABELS[t] ?? t
      )
      // Log before throwing: a customer blocked by mistake has to leave a trace we can look up
      urlCheckLog.warn(
        { url, threatTypes: safetyResult.threatTypes },
        'Blocked URL flagged by Google Safe Browsing'
      )
      throw new BadRequestError('URL is flagged as unsafe by Google Safe Browsing', {
        key: 'common:messages.error.unsafe_url',
        params: {
          url,
          threats: threatLabels.join(', '),
        },
      })
    }
  }
}
