import { AlertCircle, Check, Home, LogIn, Users, X } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { LoadingButton } from '@/shared/components/customize/loading-button'

type InvitationData = {
  org_id: { id: string; name: string }
  invite_by: { email: string }
  email: string
  expired_at: string
}

type InvitationStateProps = {
  data?: InvitationData
  token: string
  onAccept: () => void
  onDecline: () => void
  isAcceptPending: boolean
}

export const LoadingState = () => {
  const { t } = useTranslation('invitation')
  return (
    <Card className="max-w-md w-full shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold">{t('loading.title')}</CardTitle>
        <CardDescription>{t('loading.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-t-blue-600 border-b-blue-300 border-l-blue-300 border-r-blue-300 rounded-full animate-spin" />
      </CardContent>
    </Card>
  )
}

export const NotLoggedInState = ({ data, token }: Pick<InvitationStateProps, 'data' | 'token'>) => {
  const { t } = useTranslation('invitation')
  return (
    <Card className="max-w-md w-full shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold">{t('header.invited_to_join')}</CardTitle>
        <CardDescription className="text-lg font-medium">{data?.org_id.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <InviterInfo email={data?.invite_by?.email} />
        <InvitationDescription />
        <Alert>
          <div className="flex gap-2">
            <LogIn className="h-4 w-4" />
            <div className="flex flex-col">
              <AlertTitle>{t('auth_required.title')}</AlertTitle>
              <AlertDescription>{t('auth_required.description')}</AlertDescription>
            </div>
          </div>
        </Alert>
      </CardContent>
      <CardFooter className="flex justify-between space-x-4">
        <Link href="/" className="w-full">
          <Button variant="outline" className="w-full" iconLeft={<X />}>
            {t('actions.cancel')}
          </Button>
        </Link>
        <Link className="w-full" href={`/auth/login?redirect_to=/invitation/${token}`}>
          <Button className="bg-blue-600 hover:bg-blue-700 w-full" iconLeft={<LogIn />}>
            {t('actions.sign_in')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export const ValidInvitationState = ({
  data,
  onAccept,
  onDecline,
  isAcceptPending,
}: Pick<InvitationStateProps, 'data' | 'onAccept' | 'onDecline' | 'isAcceptPending'>) => {
  const { t } = useTranslation('invitation')
  return (
    <Card className="max-w-md w-full shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold">{t('header.invited_to_join')}</CardTitle>
        <CardDescription className="text-lg font-medium">{data?.org_id.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <InviterInfo email={data?.invite_by?.email} />
        <InvitationDescription />
      </CardContent>
      <CardFooter className="flex justify-between space-x-4">
        <LoadingButton isLoading={false} variant="outline" className="w-full" onClick={onDecline}>
          <X className="mr-2 h-4 w-4" />
          {t('actions.decline')}
        </LoadingButton>
        <LoadingButton
          isLoading={isAcceptPending}
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={onAccept}
        >
          <Check className="mr-2 h-4 w-4" />
          {t('actions.accept')}
        </LoadingButton>
      </CardFooter>
    </Card>
  )
}

export const AcceptedState = ({ data }: Pick<InvitationStateProps, 'data'>) => {
  const { t } = useTranslation('invitation')
  return (
    <Card className="max-w-md w-full shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-4 rounded-full">
            <Check size={32} className="text-green-600" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold text-green-600">
          {t('status.accepted.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <Alert variant="default" className="bg-green-50 border-green-200">
          <AlertDescription className="text-success">
            {t('status.accepted.description', { orgName: data?.org_id.name || 'the organization' })}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3">
        <Link href={`/org/${data?.org_id.id}`} className="w-full">
          <Button variant="outline" className="w-full" iconLeft={<Home />}>
            {t('actions.go_to_organization')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

type ErrorStateProps = {
  title: string
  description: string
}

export const ErrorState = ({ title, description }: ErrorStateProps) => {
  const { t } = useTranslation('invitation')
  return (
    <Card className="max-w-md w-full shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertCircle size={32} className="text-red-500" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold text-red-600">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-800">{description}</AlertDescription>
        </Alert>
        <div className="py-2">
          <p className="text-gray-600">{t('error_help')}</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3">
        <Link href="/" className="w-full">
          <Button variant="outline" className="w-full" iconLeft={<Home />}>
            {t('actions.return_home')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

// Shared components
const InviterInfo = ({ email }: { email?: string }) => {
  const { t } = useTranslation('invitation')
  return (
    <div className="flex items-center space-x-3 border-b pb-4">
      <div className="bg-gray-200 p-2 rounded-full">
        <Users size={20} className="text-gray-700" />
      </div>
      <div>
        <p className="font-medium">{t('inviter.label')}</p>
        <p>{email}</p>
      </div>
    </div>
  )
}

const InvitationDescription = () => {
  const { t } = useTranslation('invitation')
  return (
    <div className="py-2">
      <p className="text-gray-600">{t('description.join_benefits')}</p>
    </div>
  )
}
