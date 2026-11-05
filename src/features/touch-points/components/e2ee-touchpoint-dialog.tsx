import { TouchPoint } from '@/core/types/touch-point.type'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { useTouchPointActions } from '../hooks/use-touchpoint-actions'
import { FormItem, FormLabel } from '@/shared/components/ui/form'
import { useE2EEStore } from '@/shared/stores/e2ee-encryption-store'
import { useEffect, useState } from 'react'
import { Copy, AlertTriangle, CheckCircle2, Key, Link } from 'lucide-react'
import { AllTouchPointVariants } from '@/features/touch-points/types'
import { useCreateTouchPoint } from '../hooks/mutations'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { useOrganizationStore } from '@/shared/stores/organization-store'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

type E2EETouchPointDialogProps = {
  touchPoint: ReturnType<typeof useCreateTouchPoint>['data']
}
export const E2EETouchPointDialog = ({ touchPoint }: E2EETouchPointDialogProps) => {
  const { t } = useTranslation(['touchpoint', 'common'])
  const { organization } = useOrganizationStore()

  const isQR = !!touchPoint?.variants_content?.QR.enabled

  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(urlWithKey)
      setCopied(true)
      toast.success(t('common:toast.description_copy', { field: 'URL' }))
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error(t('common:messages.error.some_error'))
    }
  }

  const { getBase64Key } = useE2EEStore()
  const [key, setKey] = useState('')
  const urlWithKey = `${touchPoint?.short_url}#${key}`

  useEffect(() => {
    getBase64Key().then((key) => setKey(key ?? ''))
  }, [])

  const router = useRouter()

  const handleViewDetail = () => {
    router.push(
      `/org/${organization?.id}/touch-points/${touchPoint?.id}?type=${
        touchPoint?.variants_content?.[AllTouchPointVariants.QR]?.enabled ? 'qr_code' : 'short_link'
      }`
    )
  }

  return (
    <CustomDialogV2
      onInteractOutside={(e) => {
        e?.preventDefault()
      }}
      onOpenChange={(open) => {
        if (open === false) {
          handleViewDetail()
        }
      }}
      initialOpen
      title={t('touchpoint:e2ee.dialog.title')}
    >
      {({ setOpen }) => (
        <div className="flex flex-col gap-6">
          {/* Critical Warning Alert */}
          <Alert variant={'warning'} className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertDescription className="ml-2 text-sm text-amber-800 dark:text-amber-200">
              <strong className="font-semibold">{t('touchpoint:e2ee.dialog.warning.title')}</strong>
              <p className="mt-1">{t('touchpoint:e2ee.dialog.warning.description')}</p>
            </AlertDescription>
          </Alert>

          {/* Encrypted URL Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-semibold text-foreground">
                {t('touchpoint:e2ee.dialog.url_section.label')}
              </label>
            </div>
            <div className="relative">
              <Input
                value={urlWithKey}
                readOnly
                className="font-mono text-sm"
                endAdornment={
                  <>
                    {copied ? (
                      <CheckCircle2 className="h-[18px] w-[18px] text-green-600" />
                    ) : (
                      <Copy onClick={handleCopy} className="h-[18px] w-[18px] cursor-pointer" />
                    )}
                  </>
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('touchpoint:e2ee.dialog.url_section.help_text')}
            </p>
          </div>

          {/* Encryption Key Display */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-semibold text-foreground">
                {t('touchpoint:e2ee.dialog.key_section.label')}
              </label>
            </div>
            <div className="break-all rounded bg-background p-3 font-mono text-xs text-muted-foreground">
              {key || t('touchpoint:e2ee.dialog.key_section.loading')}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => handleCopy()}>
              <Copy className="mr-2 h-4 w-4" />
              {t('touchpoint:e2ee.dialog.actions.copy_url')}
            </Button>
            <Button onClick={handleViewDetail}>
              {t('touchpoint:e2ee.dialog.actions.view_detail')}
            </Button>
          </div>
        </div>
      )}
    </CustomDialogV2>
  )
}
