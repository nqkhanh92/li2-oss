'use client'

import { UserProfile } from '@/shared/providers/auth-provider'
import { ProfileForm } from '@/features/profile/components/forms/profile-form'
import { SetPasswordForm } from '@/features/profile/components/forms/set-password-form'
import { useUpdatePassword } from '@/features/profile/hooks/mutations'
import { SetPasswordFormSchema } from '@/shared/schemas/profile'
import { z } from 'zod'
import MFA from '@/features/profile/components/mfa'
import { useTranslation } from 'react-i18next'
import { SETTING_SECTIONS } from '../../constants/sections'

type Props = {
  profile: UserProfile | null
}

export const ProfileTab = ({ profile }: Props) => {
  const { mutate: updateUserPassword, isPending: isUpdateUserPassword } = useUpdatePassword()

  const handleUpdateUserPassword = (values: z.infer<typeof SetPasswordFormSchema>) => {
    updateUserPassword(values, {
      onSuccess: () => {},
    })
  }

  const { t } = useTranslation('setting')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.PROFILE_INFO}>
        <span className="text-lg font-semibold text-foreground">
          {t('profile_form.profile_infor')}
        </span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <ProfileForm profile={profile} />
        </div>
      </div>
      <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.PROFILE_PASSWORD}>
        <span className="text-lg font-semibold text-foreground">
          {t('profile_form.update_password')}
        </span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <SetPasswordForm
            onSubmit={handleUpdateUserPassword}
            isPending={isUpdateUserPassword}
            profile={profile}
            close={() => {}}
          />
        </div>
      </div>
      <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.ACCOUNT_MFA}>
        <span className="text-lg font-semibold text-slate-slate-800">
          {t('profile_form.multi-factor_authentication.label')}
        </span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <MFA />
        </div>
      </div>
      {/* <div className="flex flex-col gap-4 items-start" id="account-delete">
        <span className="text-lg font-semibold text-slate-slate-800">
          Delete data
        </span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <DeleteProfileFormDanger
            initialValues={profile}
            title="Delete data"
            description="Delete data - Permanently delete your account data"
            buttonText="Delete data"
          />
        </div>
      </div> */}
      <div className="flex flex-col gap-4 items-start h-0 md:h-[calc(100svh-60px-52px-222px)]"></div>
    </div>
  )
}
