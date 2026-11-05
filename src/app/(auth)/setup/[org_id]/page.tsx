import { SetupOrganizationForm } from '@/features/organizations/components/forms/setup-form'
import { getOrganizationById } from '@/app/actions/organization'
import { redirect } from 'next/navigation'
import { getSession } from '@/shared/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: { org_id: string } }) {
  const session = await getSession()
  if (!session) {
    redirect('/auth/login')
  }
  const organization = await getOrganizationById(params.org_id)
  if (!organization) {
    redirect('/forbidden')
  }
  if (organization.org_slug) {
    redirect(`/org/${organization.org_slug}`)
  }

  if (organization.user_id !== session.sub) {
    redirect(`/org/${organization.org_slug ?? organization.id}`)
  }
  return (
    <div className="h-screen overflow-y-auto bg-slate-100 px-4">
      <div className="min-h-full flex flex-col items-center justify-center py-12">
        <SetupOrganizationForm
          organization={{
            id: organization.id,
            name: organization.name,
          }}
        />
      </div>
    </div>
  )
}
