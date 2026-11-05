'use client'

import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyIcon, DownloadIcon, HelpCircleIcon, PenIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { GridPatternBg } from '@/shared/components/ui/grid-pattern-bg'
import { HelperTooltip } from '@/shared/components/customize/helper-tooltip'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import {
  DownloadQrPopover,
  QrRenderWithRef,
  type QrRenderRef,
} from '@/features/bootstrap/components/qr-render'
import { QrCustomizeFormElementsDialog } from '@/features/touch-points/components/simple-form/qr-customize-form-elements-dialog'
import type { Options } from 'qr-code-styling'

const QR_PREVIEW_SIZE = 90

interface QrPreviewCardProps {
  qrOptions: Options
  onQrOptionsUpdate?: (qrOptions: Options, qrLogo?: string | File) => void
  isEditMode?: boolean
  /**
   * Ẩn nút bút tuỳ biến QR. Artifact không lưu `qr_customize_options` riêng, nên mở hộp thoại
   * tuỳ biến ở đó là mời người dùng sửa một thứ không ai ghi lại. Mặc định `false` để short link
   * không đổi hành vi.
   */
  hideCustomize?: boolean
  /** Câu tooltip trên hai nút khoá khi chưa có link (artifact draft nói "Xuất bản trước đã"). */
  lockedTooltip?: string
}

export const QrPreviewCard = ({
  qrOptions,
  onQrOptionsUpdate,
  isEditMode,
  hideCustomize,
  lockedTooltip,
}: QrPreviewCardProps) => {
  const { t } = useTranslation(['touchpoint', 'common'])
  const qrRef = useRef<QrRenderRef>(null)

  const createFirstTooltip =
    lockedTooltip ??
    t('touchpoint:touch_point_create.form.qr_create_first_tooltip', {
      defaultValue: 'Create the short link first',
    })

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Label */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          <span className="text-s font-medium text-slate-700">{t('common:label.qr_code')}</span>
          <HelperTooltip
            icon={<HelpCircleIcon className="w-3.5 h-3.5 text-secondary-blue" />}
            description={t('touchpoint:touch_point_create.form.qr_preview_tooltip', {
              defaultValue: 'A QR code is automatically generated for every short link.',
            })}
          />
        </div>
        <div className="flex items-center gap-1">
          {isEditMode ? (
            <DownloadQrPopover
              qrOptions={qrOptions}
              popoverAlign="end"
              button={
                <Button
                  type="button"
                  variant="tertiary"
                  size="icon"
                  className="w-7 h-7 rounded-full"
                >
                  <DownloadIcon className="w-4 h-4" />
                </Button>
              }
            />
          ) : (
            <CustomToolTip content={createFirstTooltip} side="top">
              <span className="inline-flex cursor-not-allowed">
                <Button
                  type="button"
                  variant="tertiary"
                  size="icon"
                  className="w-7 h-7 rounded-full pointer-events-none opacity-40"
                  disabled
                >
                  <DownloadIcon className="w-4 h-4" />
                </Button>
              </span>
            </CustomToolTip>
          )}
          {isEditMode ? (
            <CustomToolTip content={t('common:actions.copy')}>
              <Button
                type="button"
                variant="tertiary"
                size="icon"
                className="w-7 h-7 rounded-full"
                onClick={() => qrRef.current?.handleCopyQr()}
              >
                <CopyIcon className="w-4 h-4" />
              </Button>
            </CustomToolTip>
          ) : (
            <CustomToolTip content={createFirstTooltip} side="top">
              <span className="inline-flex cursor-not-allowed">
                <Button
                  type="button"
                  variant="tertiary"
                  size="icon"
                  className="w-7 h-7 rounded-full pointer-events-none opacity-40"
                  disabled
                >
                  <CopyIcon className="w-4 h-4" />
                </Button>
              </span>
            </CustomToolTip>
          )}
        </div>
      </div>

      {/* QR container */}
      <div className="relative border border-border rounded-lg overflow-hidden">
        {!hideCustomize && (
          <QrCustomizeFormElementsDialog
            initQrOptions={qrOptions}
            onUpdate={(values) => {
              onQrOptionsUpdate?.(values.qr_customize_options, values.qr_logo_image)
            }}
            button={
              <Button
                type="button"
                variant="tertiary"
                size="icon"
                className="w-9 h-9 absolute top-1 right-1 z-20 bg-white! border border-border! rounded-[6px]"
              >
                <PenIcon className="w-4.5 h-4.5 text-primary" />
              </Button>
            }
          />
        )}
        <GridPatternBg gridSize={28} className="flex justify-center items-center py-4">
          <div className="rounded-xl overflow-hidden border border-border bg-white shadow-sm">
            <QrRenderWithRef
              size={QR_PREVIEW_SIZE}
              qrOptions={qrOptions}
              ref={qrRef}
              border={false}
            />
          </div>
        </GridPatternBg>
      </div>
    </div>
  )
}
