import { Button } from '@/shared/components/ui/button'
import { ExportForm } from './export-form'
import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { useRef, useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/shared/components/ui/drawer'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import PremiumBadge from '../PremiumBadge'

type ExportTouchPointsProps = {
  selectedRows?: string[]
  button?: React.ReactNode
  qrOnly?: boolean
  nfcOnly?: boolean
}
export const ExportTouchPoints = ({
  selectedRows,
  button,
  qrOnly,
  nfcOnly,
}: ExportTouchPointsProps) => {
  const { t } = useTranslation(['touchpoint', 'common'])

  return (
    <CustomDialogV2
      size={'xs'}
      button={
        button ?? (
          <Button title={t('common:buttons.export_field', { field: 'CSV' })} onClick={() => {}}>
            {t('common:buttons.export_field', { field: 'CSV' })}
          </Button>
        )
      }
      description={t('touchpoint:export.description')}
      title={
        <div className="flex gap-1 items-center">
          {t('common:buttons.export_field', { field: 'CSV' })}
          <PremiumBadge btnText="" />
        </div>
      }
      noSeparator
    >
      <ExportForm qrOnly={qrOnly} nfcOnly={nfcOnly} close={() => {}} />
    </CustomDialogV2>
  )
}
