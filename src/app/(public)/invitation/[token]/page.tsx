import { InvitationDetail } from '@/features/invitations/components/invitation-detail'
import { getProfile } from '@/shared/lib/user/profile'
import { ProfileProvider } from '@/shared/providers/auth-provider'
export default async function InvitationPage() {
  const profile = await getProfile()
  return <InvitationDetail profile={profile || null} />
}
