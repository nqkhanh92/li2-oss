'use client'
import React, { useRef } from 'react'
import { Switch } from '@/shared/components/ui/switch'
import { useGetMfa } from '@/features/profile/hooks/queries/mfa'
import { InitMfaType, useInitiateMfa } from '@/features/profile/hooks/mutations/mfa'
import { useDisableMfa } from '@/features/profile/hooks/mutations/mfa'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { MFAForm } from '@/features/profile/components/forms/mfa-form'
import { MFARecoveryForm } from '@/features/profile/components/forms/mfa-recovery-form'
import { useTranslation } from 'react-i18next'

export default function MFA() {
  const { data } = useGetMfa()
  const { mutate: disableMfa, isPending: disablePending } = useDisableMfa()
  const { mutate: initiateMfa, isPending: initiatePending, data: initiateData } = useInitiateMfa()
  const submitFormRef = useRef<DialogCustomRef>(null)
  const handleMfaChange = async (checked: boolean) => {
    if (checked) {
      initiateMfa(undefined, {
        onSuccess: () => {
          submitFormRef.current?.open()
        },
      })
    } else {
      disableMfa()
    }
  }

  const { t } = useTranslation('setting')

  const finishFormRef = useRef<DialogCustomRef>(null)
  const isAppMfaEnabled = data?.multiFactorAuths.some((mfa) => mfa.mfaType === 'app' && mfa.enabled)

  return (
    <>
      <div className="flex justify-between gap-4">
        <div className="flex flex-col gap-[2px]">
          <span className="text-lg leading-[28px] font-semibold text-foreground">
            {t('profile_form.multi-factor_authentication.app')}
          </span>
          <span className="text-sm leading-[20px] text-slate-600">
            {t('profile_form.multi-factor_authentication.description')}
          </span>
        </div>
        <LoadingMask loading={initiatePending || disablePending}>
          <Switch checked={isAppMfaEnabled} onCheckedChange={handleMfaChange} />
        </LoadingMask>
        <CustomDialog
          ref={submitFormRef}
          noFooter
          noButton
          title={t('setting:mfa.dialog_title')}
          disableBackdropClose
          className="w-[500px]"
        >
          {({ close }) => (
            <MFAForm
              initiateData={initiateData as InitMfaType}
              close={close}
              finishFormRef={finishFormRef}
            />
          )}
        </CustomDialog>

        <CustomDialog
          ref={finishFormRef}
          noFooter
          noButton
          title={t('setting:mfa.dialog_title')}
          disableBackdropClose
          className="w-[500px]"
        >
          {({ close }) => <MFARecoveryForm close={close} initiateData={initiateData} />}
        </CustomDialog>
      </div>
    </>
  )
}
