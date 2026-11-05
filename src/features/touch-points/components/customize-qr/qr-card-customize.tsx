'use client'

import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { CustomizeQrCardTool } from '../customize-tool/qr-tool'
import { FileExtension } from 'qr-code-styling'

export type QrCodePreviewRef = {
  download: (
    tp_name: string,
    short_url: string,
    fileType?: FileExtension,
    fileSize?: number | undefined
  ) => void
}

const CustomizeQrCardContainer = forwardRef<
  QrCodePreviewRef,
  {
    tp_name?: string
    close: () => void
    size?: number
  }
>(({ tp_name = 'qr_code', close, size = 168 }, ref) => {
  return (
    <div className={`w-full grid grid-8`}>
      <CustomizeQrCardTool ref={ref} close={close} size={size} />
    </div>
  )
})

export default CustomizeQrCardContainer
