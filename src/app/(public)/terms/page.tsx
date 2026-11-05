/**
 * `/terms` — the URL `op_tos_uri` in `.well-known/oauth-authorization-server` points at (P0.5).
 *
 * Same two constraints as `/privacy`: anonymous access, and the draft notice lives in the code
 * comments rather than on the page. See `features/legal/components/legal-document.tsx`.
 */
import type { Metadata } from 'next'
import { LegalDocument } from '@/features/legal/components/legal-document'

export const metadata: Metadata = {
  title: 'Terms of Service — Li2',
  description:
    'The agreement covering Li2 short links, QR codes, hosted content pages, quotas, prohibited content, and API or AI assistant access.',
}

export default function TermsPage() {
  return <LegalDocument kind="terms" />
}
