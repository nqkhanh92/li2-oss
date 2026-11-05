'use client'
import { useGetOrganizations } from '@/features/organizations/hooks/queries/queries'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useCreateOrganization } from '@/features/organizations/hooks/mutations/mutations'
import { redirect } from 'next/navigation'
import { useProfileProvider } from '@/shared/providers/auth-provider'
import { getOrgPreference, setAutoDefault, clearManualDefault } from '@/shared/lib/org-preference'

export const OrgSelection = () => {
  const { data: orgs, isLoading, isError } = useGetOrganizations()
  const { mutate: createOrg } = useCreateOrganization()
  const { replace } = useRouter()
  const { profile } = useProfileProvider()

  useEffect(() => {
    if (!isLoading && orgs && profile?.id) {
      if (orgs.length == 0) {
        redirect('/onboarding/organization')
      } else if (orgs.length > 0) {
        const pref = getOrgPreference(profile.id)
        const savedId = pref?.default_org_id
        const existingOrg = savedId
          ? orgs.find((org) => org.id === savedId || org.org_slug === savedId)
          : null

        if (existingOrg) {
          replace(`/org/${existingOrg.org_slug ?? existingOrg.id}`)
        } else {
          // Saved org no longer exists — clear stale manual pin and fall back to first org
          if (pref?.is_manual_set) clearManualDefault(profile.id)
          const firstOrgIdentifier = orgs[0].org_slug ?? orgs[0].id
          setAutoDefault(profile.id, firstOrgIdentifier)
          replace(`/org/${firstOrgIdentifier}`)
        }
      }
    }
  }, [orgs, isLoading, replace, createOrg, profile?.id])

  if (isError) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Something went wrong. Please try again.</p>
        <button className="text-sm text-blue-600 underline" onClick={() => replace('/org')}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin" />
    </div>
  )
}
