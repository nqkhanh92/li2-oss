'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

type TouchPointTab = 'short-link' | 'qr' | 'nfc'

type TouchPointNavTabsProps = {
  activeTab: TouchPointTab
}

export function TouchPointNavTabs({ activeTab }: TouchPointNavTabsProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { org_id } = useParams<{ org_id: string }>()

  const handleTabChange = (value: string) => {
    const routes: Record<TouchPointTab, string> = {
      'short-link': `/org/${org_id}/short-links`,
      qr: `/org/${org_id}/touch-points/qr-code`,
      nfc: `/org/${org_id}/touch-points/nfc`,
    }
    router.push(routes[value as TouchPointTab])
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="*:rounded-full *:h-[34px] *:py-2 *:px-4 bg-background rounded-full">
        <TabsTrigger value="short-link">{t('label.short_link', 'Short Link')}</TabsTrigger>
        <TabsTrigger value="qr">{t('label.qr_code', 'QR Code')}</TabsTrigger>
        <TabsTrigger value="nfc">{t('label.nfc_tag', 'NFC')}</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
