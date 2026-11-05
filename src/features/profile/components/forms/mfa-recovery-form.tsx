import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { toast } from '@/shared/hooks/use-toast'
import { Download } from 'lucide-react'
import { InitMfaType } from '@/features/profile/hooks/mutations/mfa'
import { useTranslation } from 'react-i18next'

type MFAFormDisableProps = {
  close: () => void
  initiateData?: InitMfaType
}

export const MFARecoveryForm = ({ close, initiateData }: MFAFormDisableProps) => {
  const { t } = useTranslation('setting')
  return (
    <>
      <div className="flex flex-col gap-6 mt-6">
        <p className="text-muted-foreground">{t('setting:mfa.finish_description')}</p>
        <div className="flex gap-4 mt-6">
          <Input readOnly variant="default" value={initiateData?.recoveryCodes[0]} />
          <Button
            variant="secondary"
            className="border-none bg-neutral-400 outline-hidden"
            size="icon"
            onClick={() => {
              const recoveryCode = initiateData?.recoveryCodes[0]
              if (!recoveryCode) {
                toast({
                  title: t('common:text.error'),
                  description: t('common:messages.error.not_found'),
                  variant: 'destructive',
                })
                return
              }

              const blob = new Blob([recoveryCode], {
                type: 'text/plain;charset=utf-8',
              })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)
              link.download = 'recovery-code-proxify.txt'
              link.click()
              URL.revokeObjectURL(link.href)
              toast({
                title: t('setting:mfa.downloaded'),
                description: t('setting:mfa.recovery_code_downloaded'),
                variant: 'success',
              })
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <Button type="button" onClick={close}>
            {t('common:buttons.finish')}
          </Button>
        </div>
      </div>
    </>
  )
}
