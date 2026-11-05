import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { DeleteProfileForm } from '@/features/profile/components/forms/delete-form'
import { ProfileForm } from '@/features/profile/components/forms/profile-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useDeleteProfile } from '@/features/profile/hooks/mutations'
import { User, Database } from 'lucide-react'
import { useRef } from 'react'

const tabs = [
  {
    name: 'Profile',
    value: 'profile',
    icon: User,
  },
  {
    name: 'Data controls',
    value: 'data-controls',
    icon: Database,
  },
]

type SettingDialogProps = {
  profile?: any
}

export const SettingDialog = ({ profile }: SettingDialogProps) => {
  const deleteAccRef = useRef<DialogCustomRef>(null)
  const { mutate: deleteProfile, isPending: isPendingDelete } = useDeleteProfile()

  const handleDelete = () => {
    deleteAccRef.current?.close?.()
    deleteProfile(undefined, {
      onSuccess: async () => {
        // await logout();
      },
    })
  }

  return (
    <>
      <Tabs
        orientation="vertical"
        defaultValue={tabs[0].value}
        className="w-full flex items-start gap-4 justify-center mt-4"
      >
        <TabsList className="shrink-0 grid grid-cols-1 h-auto w-fit gap-1 bg-transparent">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="py-1.5 justify-start rounded-[8px]"
            >
              <tab.icon className="h-5 w-5 me-2" /> {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="h-[400px] overflow-y-auto flex justify-start w-full ps-6">
          <TabsContent key="profile" value="profile" className="w-full">
            <ProfileForm profile={profile} />
          </TabsContent>
          <TabsContent key="data-controls" value="data-controls" className="w-full">
            <div className="text-lg font-bold">Account deletion</div>
            <div className="mt-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              All your profile and data will be permanently deleted.
            </div>
            {/* <Button
              onClick={() => deleteAccRef.current?.open?.()}
              className="mt-2"
              variant="destructive"
            >
              Delete my account
            </Button> */}
          </TabsContent>
        </div>
        <CustomDialog
          ref={
            deleteAccRef as React.RefObject<{
              open: () => void
              close: () => void
            }>
          }
          noFooter
          noButton
          title="Delete My Account"
          size="sm"
        >
          {({ close }) => (
            <DeleteProfileForm onSubmit={handleDelete} isPending={isPendingDelete} close={close} />
          )}
        </CustomDialog>
      </Tabs>
    </>
  )
}
