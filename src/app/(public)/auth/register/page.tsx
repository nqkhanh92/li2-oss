import { redirect } from 'next/navigation'
import { getCasdoorRegisterUrl } from '@/shared/lib/server-utils'
import { RegisterClient } from '@/features/auth/register-client'

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { redirect_to: string; dub_id: string }
}) {
  const redirect_to = searchParams?.redirect_to
  const dub_id = searchParams?.dub_id
  if (dub_id) return <RegisterClient registerUrl={getCasdoorRegisterUrl(redirect_to)} />

  if (redirect_to) {
    redirect(getCasdoorRegisterUrl(redirect_to))
  }
  redirect(getCasdoorRegisterUrl())
}
