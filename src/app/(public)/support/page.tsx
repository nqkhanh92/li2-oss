/**
 * `/support` — the URL `supportURL` in `plugin/chatgpt/plugin.json` points at, and the support
 * channel both the ChatGPT and the Claude connector directories ask for.
 *
 * ⚠️ MUST STAY REACHABLE WITHOUT A LOGIN, for the same reason as `/privacy` and `/terms`: the
 * metadata check fetches it anonymously, and a redirect to `/auth/login` reads as a dead URL. It is
 * in `(public)` and in `publicPath` in `shared/lib/casdoor/middleware.ts`.
 *
 * It reuses `LegalDocument` over the `legal` namespace rather than introducing a `support`
 * namespace: the page is the same title + dated + numbered-sections document, and a second
 * namespace would be a second file to keep in sync for no rendered difference.
 */
import type { Metadata } from 'next'
import { LegalDocument } from '@/features/legal/components/legal-document'

export const metadata: Metadata = {
  title: 'Support — Li2',
  description:
    'How to reach Li2 support, what we help with, expected response times, and how to report an abusive short link or hosted content page.',
}

export default function SupportPage() {
  return <LegalDocument kind="support" />
}
