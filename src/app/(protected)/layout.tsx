import { getUserPlan } from '@/shared/lib/plan/plans'
import { getProfile } from '@/shared/lib/user/profile'
import { ProfileProvider } from '@/shared/providers/auth-provider'
import { PlanProvider } from '@/shared/providers/plan-provider'
import { logger } from '@/infrastructure/logging/logger'
import BootstrapOnce from '@/features/bootstrap/components/bootstrap-once'
import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'

const log = logger.child({
  module: 'ProtectedLayout',
})

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  let plan, profile
  try {
    plan = await getUserPlan()
    profile = await getProfile()
  } catch (error) {
    log.error({ error })
  }

  if (profile?.is_banned) {
    const params = new URLSearchParams()
    if (profile.ban_reason) params.set('reason', profile.ban_reason)
    redirect(`/banned${params.size ? `?${params.toString()}` : ''}`)
  }

  return (
    <ProfileProvider profile={profile || null}>
      <BootstrapOnce />
      <PlanProvider plan={plan || null}>{children}</PlanProvider>
    </ProfileProvider>
  )
}
