'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'
import { Mail, MessageCircleMore } from 'lucide-react'

export const NfcEmptyState = () => {
  const { t } = useTranslation(['touchpoint', 'common'])

  const handleOpenChat = () => {
    // Open Chatwoot widget if available
    if (typeof window !== 'undefined' && window.$chatwoot) {
      window.$chatwoot.toggle('open')
    }
  }

  const handleEmailContact = () => {
    window.location.href = 'mailto:support@li2.ai?subject=NFC Chips Inquiry'
  }

  return (
    <div className="flex flex-col items-center gap-4 py-[72px] px-6">
      {/* DotLottie Animation - keeping original size */}
      <div className="w-64 h-64">
        <DotLottieReact src="/assets/animations/Search List.lottie" loop autoplay />
      </div>

      {/* Title */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[18px] font-semibold text-slate-700 leading-[26px]">
          {t('touchpoint:nfc.empty.title', 'No NFC Tags Yet')}
        </h2>
      </div>

      {/* Description */}
      <p className="text-[14px] text-slate-500 leading-[20px] text-center max-w-md">
        {t(
          'touchpoint:nfc.empty.description',
          'NFC chips are currently only available through our sales team. Contact us to learn more and order your NFC chips.'
        )}
      </p>

      {/* Buttons */}
      <div className="flex gap-4 items-start justify-center">
        {/* Chat with us button - Primary */}
        <Button
          onClick={handleOpenChat}
          className="bg-[#000d27] hover:bg-[#000d27]/90 text-white rounded-md gap-1 px-4 py-2"
        >
          <MessageCircleMore className="h-5 w-5" />
          <span className="text-[16px] font-medium leading-[24px]">
            {t('common:buttons.chat_with_us', 'Chat with us')}
          </span>
        </Button>

        {/* Email us button - Outline */}
        <Button
          onClick={handleEmailContact}
          variant="outline"
          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md gap-1 px-4 py-2"
        >
          <Mail className="h-5 w-5" />
          <span className="text-[16px] font-medium leading-[24px]">
            {t('common:buttons.email_us', 'Email us')}
          </span>
        </Button>
      </div>
    </div>
  )
}
