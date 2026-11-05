'use client'

import { useParams, useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UserProfile } from '@/shared/providers/auth-provider'
import { useShowInvitationByToken } from '@/features/invitations/hooks/queries'
import { useAcceptInvitation } from '@/features/invitations/hooks/mutations'
import { useInvitationStatus } from '@/features/invitations/hooks/use-invitation-status'
import {
  LoadingState,
  NotLoggedInState,
  ValidInvitationState,
  AcceptedState,
  ErrorState,
} from './invitation-states'
import { setAutoDefault } from '@/shared/lib/org-preference'

type InvitationDetailProps = {
  profile: UserProfile | null
}

export const InvitationDetail = ({ profile }: InvitationDetailProps) => {
  const router = useRouter()
  const { t } = useTranslation(['common', 'invitation'])
  const { token } = useParams<{ token: string }>()
  const { data, isLoading } = useShowInvitationByToken(token)
  const { mutate: handleAcceptInvitation, isPending: isAcceptPending } = useAcceptInvitation()
  const { status, setStatus } = useInvitationStatus(data, profile)

  const handleAccept = () => {
    handleAcceptInvitation(token, {
      onSuccess: () => {
        setStatus('accepted')
        setTimeout(() => {
          if (!data?.org_id.id) return
          if (profile?.id) setAutoDefault(profile.id, data.org_id.org_slug ?? data.org_id.id)
          router.push(`/org/${data.org_id.org_slug || data.org_id.id}`)
        }, 3000)
      },
    })
  }

  const handleDecline = () => {
    setStatus('declined')
  }

  const renderContent = () => {
    if (isLoading) return <LoadingState />

    if (status === 'not-logged-in') {
      return <NotLoggedInState data={data} token={token} />
    }

    if (status === 'valid') {
      return (
        <ValidInvitationState
          data={data}
          onAccept={handleAccept}
          onDecline={handleDecline}
          isAcceptPending={isAcceptPending}
        />
      )
    }

    if (status === 'accepted') {
      return <AcceptedState data={data} />
    }

    // Error states: expired, invalid, declined, forbidden
    const errorStatus = status || 'invalid'
    return (
      <ErrorState
        title={t(`invitation:status.${errorStatus}.title`)}
        description={t(`invitation:status.${errorStatus}.description`)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center">
        <div className="bg-blue-600 p-2 rounded-lg mr-3">
          <Users size={24} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-blue-600">{t('common:appName')}</h1>
      </div>

      {/* Dynamic content based on invitation status */}
      {renderContent()}

      <p className="mt-8 text-sm text-gray-500">
        {t('invitation:footer.copyright', {
          year: new Date().getFullYear(),
          appName: t('common:appName'),
        })}
      </p>
    </div>
  )
}
