import { redirect } from 'next/navigation'
import { getCasdoorLoginUrl } from '@/shared/lib/server-utils'
import { LoginClient } from '@/features/auth/login-client'
export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect_to: string; dub_id: string }
}) {
  const redirect_to = searchParams?.redirect_to
  const dub_id = searchParams?.dub_id
  const loginUrl = getCasdoorLoginUrl(redirect_to)

  if (dub_id) return <LoginClient loginUrl={loginUrl} />

  if (redirect_to) {
    redirect(loginUrl)
  }
  redirect(loginUrl)
}
