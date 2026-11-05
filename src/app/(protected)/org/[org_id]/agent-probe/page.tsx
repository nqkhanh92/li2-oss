// Phase 0 dev-only seam probe. No nav entry, no i18n, no design polish.
import { notFound } from 'next/navigation'
import { getOrganizationById } from '@/app/actions/organization'
import { AgentProbePanel } from '@/ee/features/agent-probe/components/agent-probe-panel'

export default async function AgentProbePage({ params }: { params: Promise<{ org_id: string }> }) {
  const { org_id } = await params
  // [org_id] is a slug in the URL; resolve to the real UUID for the mint endpoint.
  const org = await getOrganizationById(org_id)
  if (!org) notFound()
  return <AgentProbePanel orgId={org.id} />
}
