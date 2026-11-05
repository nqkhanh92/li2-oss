import { CreateOrganizationForm } from '@/features/organizations/components/forms/create-form'

export default function CreateOrganizationPage() {
  return (
    <div className="h-screen overflow-y-auto bg-slate-100 px-4">
      <div className="min-h-full flex flex-col items-center justify-center py-12">
        <CreateOrganizationForm />
      </div>
    </div>
  )
}
