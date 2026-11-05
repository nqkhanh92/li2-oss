/**
 * `/privacy` — the URL `op_policy_uri` in `.well-known/oauth-authorization-server` points at (P0.5).
 *
 * ⚠️ MUST STAY REACHABLE WITHOUT A LOGIN. It is in `(public)` and in `publicPath` in
 * `shared/lib/casdoor/middleware.ts`; a directory reviewer and a connector's consent screen both
 * fetch it anonymously, and a redirect to `/auth/login` reads as "there is no policy".
 *
 * A server component so the page can carry `metadata`; the text itself is a client component
 * because the translation namespace is fetched in the browser.
 */
import type { Metadata } from 'next'
import { LegalDocument } from '@/features/legal/components/legal-document'

export const metadata: Metadata = {
  title: 'Privacy Policy — Li2',
  description:
    'What data Li2 collects from short links, QR codes and hosted content pages, what it is used for, and who it is shared with.',
}

export default function PrivacyPage() {
  return <LegalDocument kind="privacy" />
}
