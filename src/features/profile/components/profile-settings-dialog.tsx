'use client'

import * as React from 'react'
import { Suspense } from 'react'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { UserProfile } from '@/shared/providers/auth-provider'
import { ProfileForm } from './forms/profile-form'
import { SetPasswordForm } from './forms/set-password-form'
import { useUpdatePassword } from '../hooks/mutations'
import { SetPasswordFormSchema } from '@/shared/schemas/profile'
import { z } from 'zod'
import MFA from './mfa'
import { useTranslation } from 'react-i18next'
import { User, Lock, Shield } from 'lucide-react'
import { Skeleton } from '@/shared/components/ui/skeleton'

function ProfileSettingsDialogSkeleton() {
  return (
    <div className="w-full">
      <div className="mb-4">
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-[8px]" />
            </div>
          ))}
          <div className="space-y-2 md:col-span-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-[8px]" />
          </div>
        </div>
        <div className="mt-4">
          <Skeleton className="h-10 w-24 rounded-[8px]" />
        </div>
      </div>
    </div>
  )
}

interface ProfileSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: UserProfile | null
}

export function ProfileSettingsDialog({ open, onOpenChange, profile }: ProfileSettingsDialogProps) {
  const { t } = useTranslation('setting')
  const { mutate: updateUserPassword, isPending: isUpdateUserPassword } = useUpdatePassword()
  const [activeTab, setActiveTab] = React.useState('profile')

  const handleUpdateUserPassword = (values: z.infer<typeof SetPasswordFormSchema>) => {
    updateUserPassword(values, {
      onSuccess: () => {},
    })
  }

  return (
    <CustomDialogV2
      open={open}
      onOpenChange={onOpenChange}
      title={t('profile_form.profile_settings')}
      size="md"
    >
      <Suspense fallback={<ProfileSettingsDialogSkeleton />}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{t('profile_form.profile_infor')}</span>
              <span className="sm:hidden">{t('profile_form.profile')}</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">{t('profile_form.password')}</span>
              <span className="sm:hidden">{t('profile_form.password')}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{t('profile_form.security')}</span>
              <span className="sm:hidden">{t('profile_form.security')}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-0 space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <ProfileForm profile={profile} />
          </div>
        </TabsContent>

        <TabsContent value="password" className="mt-0 space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                {t('profile_form.update_password')}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {t('profile_form.update_password_description')}
              </p>
            </div>
            <SetPasswordForm
              onSubmit={handleUpdateUserPassword}
              isPending={isUpdateUserPassword}
              profile={profile}
              close={() => {}}
            />
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-0 space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                {t('profile_form.multi-factor_authentication.label')}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{t('profile_form.mfa_description')}</p>
            </div>
            <MFA />
          </div>
        </TabsContent>
      </Tabs>
      </Suspense>
    </CustomDialogV2>
  )
}
