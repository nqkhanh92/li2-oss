'use client'

import { useWatch, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { LockKeyhole } from 'lucide-react'
import { ShortLinkToggleE2EE, ShortLinkE2EEDescription } from './e2ee-toggle'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'
import { useParams } from 'next/navigation'

export const ShortLinkEncryptedLinkSection = () => {
  const { control } = useFormContext<ShortLinkFormValues>()
  const { t } = useTranslation(['touchpoint'])
  const e2eEncryption = useWatch({ control, name: 'privacy_security.e2e_encryption' })

  const formKey = e2eEncryption ? 'enabled' : 'disabled'

  const { touch_point_id } = useParams<{ touch_point_id: string }>()

  const isEditMode = !!touch_point_id

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-border">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <LockKeyhole className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">
            {t('touchpoint:advancedOptionMenu.items.encrypted_link.title')}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('touchpoint:advancedOptionMenu.items.encrypted_link.description', {
              defaultValue:
                'End-to-end encrypt your destination URL so only the recipient can read it.',
            })}
          </p>
        </div>
        <div className={isEditMode ? 'opacity-50 pointer-events-none' : undefined}>
          <ShortLinkToggleE2EE />
        </div>
      </div>

      {isEditMode && (
        <Alert variant={e2eEncryption ? 'info' : 'default'}>
          <AlertTitle>{t(`touchpoint:e2ee.form.${formKey}.title`)}</AlertTitle>
          <AlertDescription>{t(`touchpoint:e2ee.form.${formKey}.description`)}</AlertDescription>
        </Alert>
      )}

      {!isEditMode && e2eEncryption && <ShortLinkE2EEDescription />}
    </div>
  )
}
