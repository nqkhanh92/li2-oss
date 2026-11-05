import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Button } from '@/shared/components/ui/button'
import { EllipsisVertical } from 'lucide-react'
import { ImportTouchPoints } from '../import'
import { isCloud } from '@/shared/constants/edition'
import { ImportFromSheetsButton } from '../import/import-from-sheets'
import { ExportTouchPoints } from '../export'
import { ExportToSheetsButton } from '../export/export-to-sheets'
import { SheetsIcon } from '@/shared/components/icons/sheets-icon'
import { DownloadIcon } from 'lucide-react'
import { UploadIcon } from 'lucide-react'
import { FileSpreadsheet } from 'lucide-react'
import { DropdownMenuGroup } from '@/shared/components/ui/dropdown-menu'

type ImportExportActionProps = {
  qrOnly?: boolean
  nfcOnly?: boolean
}
export const ImportExportAction = ({ qrOnly, nfcOnly }: ImportExportActionProps) => {
  const { t } = useTranslation(['touchpoint', 'common'])
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="secondary" className="gap-1 size-10">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent forceMount align="start" className="py-2 space-y-2 *:px-4 *:py-1.5">
        <DropdownMenuGroup title="Import">
          <DropdownMenuLabel className="flex gap-1 items-center px-0">
            <UploadIcon className="w-4.5 h-4.5" /> {t('touchpoint:import.title')}
          </DropdownMenuLabel>
          <ImportTouchPoints
            button={
              <DropdownMenuItem
                className="flex gap-1 text-s! font-normal"
                onSelect={(e) => e.preventDefault()}
              >
                <FileSpreadsheet className="w-4.5 h-4.5" />
                {t('touchpoint:import.from_csv')}
              </DropdownMenuItem>
            }
          />
          {isCloud && process.env.NEXT_PUBLIC_APP_ENV === 'development' && (
            <ImportFromSheetsButton
              button={
                <DropdownMenuItem
                  className="flex gap-1 text-s! font-normal"
                  onSelect={(e) => e.preventDefault()}
                >
                  <SheetsIcon className="w-4.5 h-4.5" />
                  {t('touchpoint:import.from_sheets')}
                </DropdownMenuItem>
              }
            />
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="h-px py-0!" />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex gap-1 items-center px-0">
            <DownloadIcon className="w-4.5 h-4.5" /> {t('touchpoint:export.title')}
          </DropdownMenuLabel>
          <ExportTouchPoints
            qrOnly={qrOnly}
            nfcOnly={nfcOnly}
            button={
              <DropdownMenuItem
                className="flex gap-1 text-s! font-normal"
                onSelect={(e) => e.preventDefault()}
              >
                <FileSpreadsheet className="w-4.5 h-4.5" />
                {t('touchpoint:export.to_csv')}
              </DropdownMenuItem>
            }
          />
          {isCloud && process.env.NEXT_PUBLIC_APP_ENV === 'development' && (
            <ExportToSheetsButton
              qrOnly={qrOnly}
              nfcOnly={nfcOnly}
              button={
                <DropdownMenuItem
                  className="flex gap-1 text-s! font-normal"
                  onSelect={(e) => e.preventDefault()}
                >
                  <SheetsIcon className="w-4.5 h-4.5" />
                  {t('touchpoint:export.to_sheets')}
                </DropdownMenuItem>
              }
            />
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
