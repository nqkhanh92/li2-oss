import { useGoogleLogin } from '@react-oauth/google'
import { useFormContext, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { googleSheetsConfigSchema } from '@/shared/schemas/integrations'
import { googleScopes } from '@/features/integrations/constants'
import { useEffect, useState, useTransition } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { GoogleIcon } from '@/shared/components/icons/google-icon'

type Props = {
  initialValue: z.infer<typeof googleSheetsConfigSchema>
  setVerified: (verified: boolean | null) => void
}
export const GoogleSheetsForm = ({ initialValue, setVerified }: Props) => {
  const [grantedAccess, setGrantedAccess] = useState<boolean | null>(null)
  const [isLogging, startLogging] = useTransition()

  useEffect(() => {
    if (initialValue && initialValue.config?.id_token) {
      setGrantedAccess(true)
      setVerified(true)
    }
  }, [initialValue])

  const login = useGoogleLogin({
    scope: googleScopes.join(' '),
    flow: 'auth-code',
    onError: (err) => {
      setGrantedAccess(false)
    },
    onSuccess: (res) => {
      const hasAccess = googleScopes.every((scope) => res.scope.includes(scope))
      setGrantedAccess(hasAccess)
      setVerified(hasAccess)
      if (hasAccess) {
        setValue('config.auth_code', res.code)
      } else {
        resetField('config.auth_code')
      }
    },
    onNonOAuthError(nonOAuthError) {},
  })

  const relogin = useGoogleLogin({
    scope: googleScopes.join(' '),
    flow: 'auth-code',
    onError: (err) => {
      setGrantedAccess(false)
      setVerified(false)
      resetField('config.auth_code')
    },
    onSuccess: (res) => {
      const hasAccess = googleScopes.every((scope) => res.scope.includes(scope))
      setGrantedAccess(hasAccess)
      setVerified(hasAccess)
      if (hasAccess) {
        setValue('config.auth_code', res.code)
      } else {
        resetField('config.auth_code')
      }
    },
    onNonOAuthError(nonOAuthError) {},
  })
  const handleReLogin = () => {
    startLogging(async () => {
      await relogin()
    })
  }

  const handleLogin = () => {
    startLogging(async () => {
      await login()
    })
  }

  const { setValue, resetField } = useFormContext<z.infer<typeof googleSheetsConfigSchema>>()

  return (
    <div>
      {grantedAccess !== null && (
        <div>
          {grantedAccess ? (
            <div>
              <Alert variant={'success'}>
                <AlertTitle>Access Granted</AlertTitle>
                <AlertDescription>
                  Click the button below to connect with another account
                </AlertDescription>

                <LoadingButton
                  isLoading={isLogging}
                  type="button"
                  variant={'secondary'}
                  onClick={handleReLogin}
                  iconLeft={<GoogleIcon />}
                >
                  Connect With Another Account
                </LoadingButton>
              </Alert>
            </div>
          ) : (
            <div>
              <Alert variant={'destructive'}>
                <AlertTitle>Access Grant Failed</AlertTitle>
                <AlertDescription>You must allow google sheets permission.</AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      )}
      {!grantedAccess && (
        <LoadingButton
          variant={'secondary'}
          isLoading={isLogging}
          type="button"
          onClick={handleLogin}
          iconLeft={<GoogleIcon />}
        >
          Login With Google
        </LoadingButton>
      )}
    </div>
  )
}
