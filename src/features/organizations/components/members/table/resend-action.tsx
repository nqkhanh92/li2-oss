import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useResendInvitation } from '@/features/invitations/hooks/mutations'
import { Mail } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'

export const ResendAction = ({ id }: { id: string }) => {
  const { t } = useTranslation('setting')
  const { org_id } = useParams<{ org_id: string }>()
  const { mutate: resendInvitation, isPending } = useResendInvitation(org_id)
  const handleResend = () => {
    resendInvitation(id)
  }
  return (
    <LoadingButton
      variant="outline"
      className={`w-full justify-between shadow-none border-none relative flex cursor-default font-medium h-auto
         select-none items-center gap-2 rounded-sm px-2 py-1.5 transition-colors 
         focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0
         text-sm leading-[20px] text-slate-500`}
      size="sm"
      onClick={handleResend}
      isLoading={isPending}
    >
      {t('members.actions.resend_invite')} <Mail className="h-4 w-4 opacity-60" />
    </LoadingButton>
  )
}
