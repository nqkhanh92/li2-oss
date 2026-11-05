import { redirect } from 'next/navigation'
import { orgHomePath } from '@/shared/constants'

export default function OrgIndexPage({ params }: { params: { org_id: string } }) {
  redirect(orgHomePath(params.org_id))
}
