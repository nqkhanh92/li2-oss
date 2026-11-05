import { useEffect, useState } from 'react'
import { UserProfile } from '@/shared/providers/auth-provider'

type InvitationData = {
  email: string
  expired_at: string
}

type InvitationStatus =
  | 'valid'
  | 'accepted'
  | 'declined'
  | 'invalid'
  | 'expired'
  | 'not-logged-in'
  | 'forbidden'

export const useInvitationStatus = (
  data: InvitationData | undefined,
  profile: UserProfile | null
) => {
  const [status, setStatus] = useState<InvitationStatus>()

  useEffect(() => {
    if (!data) {
      setStatus('invalid')
      return
    }

    if (!profile?.id) {
      setStatus('not-logged-in')
      return
    }

    if (data.email !== profile.email) {
      setStatus('forbidden')
      return
    }

    if (data.expired_at < new Date().toISOString()) {
      setStatus('expired')
      return
    }

    setStatus('valid')
  }, [data, profile])

  return { status, setStatus }
}
