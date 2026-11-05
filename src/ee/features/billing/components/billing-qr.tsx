'use client'

import { useEffect, useRef } from 'react'
import QRCodeStyling from 'qr-code-styling'

type Props = {
  value: string
  size?: number
}

export function BillingQr({ value, size = 256 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const qrRef = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    if (!ref.current) return

    const qr = new QRCodeStyling({
      width: size,
      height: size,
      type: 'svg',
      data: value,
      image: 'https://supa.li2.ai/storage/v1/object/public/casdoor-logo/ftc/qr-logo-li2.png',
      dotsOptions: { type: 'rounded', color: '#100D1F' },
      cornersSquareOptions: { type: 'extra-rounded', color: '#100D1F' },
      cornersDotOptions: { type: 'dot', color: '#5B3BBF' },
      backgroundOptions: { color: '#ffffff' },
      imageOptions: { crossOrigin: 'anonymous', imageSize: 0.35, margin: 4, hideBackgroundDots: false },
      qrOptions: { errorCorrectionLevel: 'H' },
    })

    ref.current.innerHTML = ''
    qr.append(ref.current)
    qrRef.current = qr
  }, [value, size])

  return <div ref={ref} className="rounded-xl overflow-hidden" />
}
