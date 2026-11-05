import { lazy, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { touchPointFormCreateWithAdvanceSchema } from '@/shared/schemas/touch-points'
import { z } from 'zod'
import {
  decryptDestination,
  encryptDestination,
  exportKeyB64Url,
  generateAes128GcmKey,
} from '@/shared/utils/crypto-utils'
import { toast } from 'sonner'
import { validateUrl } from '@/shared/lib/utils'
import { CustomSwitch } from '@/shared/components/customize/custom-switch'
import { CopyIcon, InfoIcon, LockIcon, UnlockIcon } from 'lucide-react'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { useE2EEStore } from '@/shared/stores/e2ee-encryption-store'
import { useTranslation } from 'react-i18next'
import { usePlanFeatures } from '@/features/touch-points/hooks'
import PremiumBadge from '../../PremiumBadge'

export const ToggleE2EE = () => {
  const { t } = useTranslation(['touchpoint'])
  const { enableE2EE: planEnableE2EE } = usePlanFeatures()
  const form = useFormContext<z.infer<typeof touchPointFormCreateWithAdvanceSchema>>()
  const { isE2EEEnabled, setIsE2EEEnabled, e2eeKey, setE2EEKey, reset } = useE2EEStore()
  useEffect(() => {
    reset()
  }, [])

  const destination = useWatch({
    control: form.control,
    name: 'content_value',
  })
  const loadBlacklist = async () => {
    const { default: blacklist } = await import('@/shared/constants/blacklist-domain.json')
    return blacklist
  }

  const [isDestinationValid, setIsDestinationValid] = useState(false)
  useEffect(() => {
    const checkDestination = async () => {
      if (!destination) return setIsDestinationValid(false)

      const isValid = validateUrl(destination)
      if (!isValid) return setIsDestinationValid(false)

      const blacklist = await loadBlacklist()
      const isBlacklisted = blacklist.includes(destination)
      setIsDestinationValid(!isBlacklisted)
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
          form.setValue('content_value', `https://li2.ai`)
        }
      } else {
        form.setFocus('content_value')
      }
      form.trigger('content_value')
    } else {
      const payload = {
        alg: form.getValues('privacy_security.e2e_encryption')?.algorithm ?? '',
        iv: form.getValues('privacy_security.e2e_encryption')?.iv ?? '',
        ciphertext: form.getValues('privacy_security.e2e_encryption')?.cipher ?? '',
        tagLength: form.getValues('privacy_security.e2e_encryption')?.tag_length ?? 128,
      }
      if (e2eeKey && payload) {
        const result = await decryptDestination(payload, e2eeKey)
        if (result) {
          form.setValue('privacy_security.e2e_encryption', undefined)
          form.setValue('content_value', result)
          setIsE2EEEnabled(false)
          setE2EEKey(null)
        }
      }
    }
  }
  return (
    <div className="flex gap-1">
      <CustomToolTip
        contentClassName="max-w-[320px]"
        content={
          <div className="flex flex-col gap-2 items-center text-center">
            <PremiumBadge btnText="" />
            <span>{t('touchpoint:e2ee.toggle.tooltip')}</span>
          </div>
        }
        className="ml-2"
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
          checked={isE2EEEnabled}
          onCheckedChange={handleToggle}
          disabled={!planEnableE2EE}
        />
      </CustomToolTip>
    </div>
  )
}

export const E2EEDescription = () => {
  const { t } = useTranslation(['touchpoint'])
  const form = useFormContext<z.infer<typeof touchPointFormCreateWithAdvanceSchema>>()
  const { isE2EEEnabled, e2eeKey } = useE2EEStore()

  const [base64Key, setBase64Key] = useState('')

  useEffect(() => {
    if (isE2EEEnabled && e2eeKey) {
      const updateBase64Key = async () => {
        const key = await exportKeyB64Url(e2eeKey)
        setBase64Key(key)
      }
      updateBase64Key()
    } else {
      setBase64Key('')
    }
  }, [e2eeKey, isE2EEEnabled])

  if (!base64Key) return

  const handleCopy = () => {
    navigator.clipboard.writeText(base64Key)
    toast.success(t('touchpoint:e2ee.description.copy_success'))
  }

  return (
    <div className="mt-1">
      {isE2EEEnabled && e2eeKey && (
        <Alert variant={'warning'}>
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
      )}
    </div>
  )
}
