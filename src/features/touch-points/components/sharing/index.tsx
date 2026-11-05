import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Copy } from 'lucide-react'
import { XTwitterIcon } from '@/shared/components/icons/x-twitter-icon'
import { toast } from '@/shared/hooks/use-toast'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'
import { FacebookIcon } from '@/shared/components/icons/facebook-icon'
import { LinkedInIcon } from '@/shared/components/icons/linkedin-icon'
import { ZaloIcon } from '@/shared/components/icons/zalo-icon'
import { InstagramIcon } from '@/shared/components/icons/instagram-icon'
import { GmailIcon } from '@/shared/components/icons/gmail-icon'
import { MessengerIcon } from '@/shared/components/icons/messenger-icon'

const shareItem = [
  {
    name: 'Facebook',
    icon: <FacebookIcon className="w-7 h-7" />,
    url: 'https://www.facebook.com/sharer/sharer.php?u=',
    disabled: false,
  },
  {
    name: 'Instagram',
    icon: <InstagramIcon className="w-7 h-7" />,
    url: 'https://www.instagram.com/shareArticle?mini=true&url=',
    disabled: false,
  },
  // {
  //   name: 'Messenger',
  //   icon: <MessengerIcon className="w-6 h-6" />,
  //   url: 'https://www.messenger.com/t/?link=',
  //   disabled: false,
  // },
  {
    name: 'Twitter',
    icon: <XTwitterIcon className="w-6 h-6  " />,
    url: 'https://twitter.com/intent/tweet?url=',
    disabled: false,
  },
  {
    name: 'LinkedIn',
    icon: <LinkedInIcon className="w-6 h-6" />,
    url: 'https://www.linkedin.com/shareArticle?mini=true&url=',
    disabled: false,
  },

  {
    name: 'Zalo',
    icon: <ZaloIcon className="w-7 h-7" />,
    url: 'https://zalo.me/sns.do?url=',
    disabled: true,
  },
  {
    name: 'Gmail',
    icon: <GmailIcon className="w-8 h-8" />,
    url: 'https://mail.google.com/mail/?view=cm&fs=1&su=Chia%20sẻ%20link&body=Mình%20gửi%20bạn%20link:%20',
    disabled: false,
  },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string | null
}

export const SharingModal = ({ open, onOpenChange, url }: Props) => {
  const { t } = useTranslation(['common', 'touchpoint'])
  const handleCopy = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast({
      title: t('common:text.copied'),
      variant: 'success',
      description: t('common:messages.copy_to_clipboard'),
    })
  }

  return (
    <CustomDialogV2
      size="xs"
      title={
        <div className="flex items-center space-x-3 justify-center">
          <h3 className="text-lg font-semibold text-slate-600">{t('touchpoint.share')}</h3>
        </div>
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="flex gap-4">
        {shareItem.map(
          (item) =>
            !item.disabled && (
              <button
                key={item.name}
                onClick={() =>
                  window.open(
                    item.url + encodeURIComponent(url || ''),
                    '_blank',
                    'width=600,height=400'
                  )
                }
                className="w-12 h-12 border border-neutral-400 rounded-md flex items-center justify-center hover:bg-neutral-400"
              >
                {item.icon}
              </button>
            )
        )}
      </div>
      <div className="flex items-center space-x-3 justify-between border border-neutral-400 p-2 mt-2 rounded-md">
        <div className="text-sm text-slate-600 text-ellipsis overflow-hidden max-w-[250px]">
          {url}
        </div>
        <Button
          type="button"
          onClick={() => handleCopy(url || '')}
          className="text-slate-400 border-none bg-transparent"
          variant="ghost"
        >
          <Copy />
        </Button>
      </div>
    </CustomDialogV2>
  )
}
