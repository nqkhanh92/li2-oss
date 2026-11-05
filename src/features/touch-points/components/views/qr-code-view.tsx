'use client'

import { useTranslation } from 'react-i18next'

import { ContentLayout } from '@/shared/components/layout/content-layout'
import { QrList } from '@/features/touch-points/components/touch-point-list/qr-list'
// import { StaticQrList } from '@/features/touch-points/components/static-qr/static-qr-list'
import { TouchPointNavTabs } from '@/features/touch-points/components/touch-point-nav-tabs'

export default function QrCodeView() {
  const { t } = useTranslation(['common'])

  return (
    <ContentLayout
      title={t('common:module.qr_code_list')}
      isBackable={false}
      extra={<TouchPointNavTabs activeTab="qr" />}
    >
      <QrList />
      {/* <StaticQrList /> */}
    </ContentLayout>
  )
}
