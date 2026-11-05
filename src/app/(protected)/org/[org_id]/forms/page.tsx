import { redirect } from 'next/navigation'

export default async function FormsPage({ params }: { params: { org_id: string } }) {
  redirect(`/org/${params.org_id}/site-analytics`)
}
