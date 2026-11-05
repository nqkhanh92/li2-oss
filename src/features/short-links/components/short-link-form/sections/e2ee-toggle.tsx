'use client'

import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import {
  decryptDestination,
  encryptDestination,
  exportKeyB64Url,
  generateAes128GcmKey,
} from '@/shared/utils/crypto-utils'
import { toast } from 'sonner'
import { validateUrl } from '@/shared/lib/utils'
import { CustomSwitch } from '@/shared/components/customize/custom-switch'
import { CopyIcon, LockIcon, UnlockIcon } from 'lucide-react'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { useE2EEStore } from '@/shared/stores/e2ee-encryption-store'
import { useTranslation } from 'react-i18next'
import { usePlanFeatures } from '@/features/touch-points/hooks'
import PremiumBadge from '@/features/touch-points/components/PremiumBadge'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

export const ShortLinkToggleE2EE = () => {
  const { t } = useTranslation(['touchpoint'])
  const { enableE2EE: planEnableE2EE } = usePlanFeatures()
  const form = useFormContext<ShortLinkFormValues>()
  const { isE2EEEnabled, setIsE2EEEnabled, e2eeKey, setE2EEKey, reset } = useE2EEStore()

  const [destination, formE2EEValue] = useWatch({
    control: form.control,
    name: ['content_value', 'privacy_security.e2e_encryption'],
  })

  const [isDestinationValid, setIsDestinationValid] = useState(false)
  useEffect(() => {
    const checkDestination = async () => {
      if (!destination) return setIsDestinationValid(false)
      if (!validateUrl(destination)) return setIsDestinationValid(false)
      const { default: blacklist } = await import('@/shared/constants/blacklist-domain.json')
      setIsDestinationValid(!blacklist.includes(destination))
    }
    checkDestination()
  }, [destination])

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      if (destination && isDestinationValid) {
        const key = await generateAes128GcmKey()
        setE2EEKey(key)
        setIsE2EEEnabled(true)
        const result = await encryptDestination(destination, key)
        if (result) {
          form.setValue('privacy_security.e2e_encryption', {
            iv: result.iv,
            algorithm: result.alg,
            cipher: result.ciphertext,
            tag_length: result.tagLength,
            version: '1',
          })
          form.setValue('content_value', 'https://li2.ai')
        }
      } else {
        // Destination is missing — switch to basic tab to fill it in
        toast.info(
          t('touchpoint:e2ee.no_destination', {
            defaultValue: 'Please enter a valid destination URL first.',
          })
        )
      }
      form.trigger('content_value')
    } else {
      if (!e2eeKey) {
        // CryptoKey was lost (tab remount discards in-memory keys).
        // Clear E2EE state; user must re-enter the destination URL.
        form.setValue('privacy_security.e2e_encryption', undefined)
        form.setValue('content_value', '')
        setIsE2EEEnabled(false)
        toast.warning(
          t('touchpoint:e2ee.key_lost_warning', {
            defaultValue:
              'Encryption key is no longer in memory. E2EE has been cleared — please re-enter your destination URL.',
          })
        )
        return
      }
      const payload = {
        alg: form.getValues('privacy_security.e2e_encryption')?.algorithm ?? '',
        iv: form.getValues('privacy_security.e2e_encryption')?.iv ?? '',
        ciphertext: form.getValues('privacy_security.e2e_encryption')?.cipher ?? '',
        tagLength: form.getValues('privacy_security.e2e_encryption')?.tag_length ?? 128,
      }
      const result = await decryptDestination(payload, e2eeKey)
      if (result) {
        form.setValue('privacy_security.e2e_encryption', undefined)
        form.setValue('content_value', result)
        setIsE2EEEnabled(false)
        setE2EEKey(null)
      }
    }
  }

  // Derive checked from both Zustand and form value so the toggle
  // shows correctly after a tab remount (store re-synced but flag just set).
  const isChecked = isE2EEEnabled || !!formE2EEValue

  return (
    <CustomToolTip
      contentClassName="max-w-[320px]"
      content={
        <div className="flex flex-col gap-2 items-center text-center">
          <PremiumBadge btnText="" />
          <span>{t('touchpoint:e2ee.toggle.tooltip')}</span>
        </div>
      }
    >
      <CustomSwitch
        checkedLabel={t('touchpoint:e2ee.toggle.label')}
        uncheckedLabel={t('touchpoint:e2ee.toggle.label')}
        thumbIcon={{
          checked: <LockIcon className="text-semantic-info!" />,
          unchecked: <UnlockIcon className="text-semantic-warning!" />,
        }}
        checkedColor="bg-semantic-success"
        uncheckedColor="bg-slate-300"
        checked={isChecked}
        onCheckedChange={handleToggle}
        disabled={!planEnableE2EE}
      />
    </CustomToolTip>
  )
}

export const ShortLinkE2EEDescription = () => {
  const { t } = useTranslation(['touchpoint'])
  const { isE2EEEnabled, e2eeKey } = useE2EEStore()
  const [base64Key, setBase64Key] = useState('')

  useEffect(() => {
    if (isE2EEEnabled && e2eeKey) {
      exportKeyB64Url(e2eeKey).then(setBase64Key)
    } else {
      setBase64Key('')
    }
  }, [e2eeKey, isE2EEEnabled])

  if (!base64Key) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(base64Key)
    toast.success(t('touchpoint:e2ee.description.copy_success'))
  }

  return (
    <Alert variant="warning">
      <AlertTitle>{t('touchpoint:e2ee.description.title')}</AlertTitle>
      <AlertDescription>
        {t('touchpoint:e2ee.description.warning')}
        <p className="font-semibold mt-2">{t('touchpoint:e2ee.description.key_label')}</p>
        <div className="flex gap-2 items-center">
          <span className="text-slate-500 break-all">{base64Key}</span>
          <CopyIcon className="size-4 cursor-pointer flex-shrink-0" onClick={handleCopy} />
        </div>
      </AlertDescription>
    </Alert>
  )
}
