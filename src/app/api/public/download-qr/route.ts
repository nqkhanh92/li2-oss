import { getQrDefaultOptions } from '@/features/touch-points/constants'
import { withAnonAuth } from '@/shared/lib/middlewares/with-anon-auth'
import { NextResponse } from 'next/server'
import { Options } from 'qr-code-styling'
import QRCodeStyling from 'qr-code-styling'
import { JSDOM } from 'jsdom'
import nodeCanvas from 'canvas'

export const POST = withAnonAuth(async (request: Request) => {
  let qrOptions: Options
  let fileType: 'png' | 'svg'

  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData()
    const qrOptionsStr = formData.get('qrOptions') as string
    const fileTypeStr = formData.get('fileType') as string
    qrOptions = JSON.parse(qrOptionsStr)
    fileType = fileTypeStr as 'png' | 'svg'
  } else {
    const body = await request.json()
    qrOptions = body.qrOptions
    fileType = body.fileType
  }

  if (!qrOptions || !qrOptions.data || !fileType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const options: Options = {
    ...getQrDefaultOptions(qrOptions.data),
    ...qrOptions,
    nodeCanvas,
    jsdom: JSDOM,
  }

  const qr = new QRCodeStyling(options)
  const data = await qr.getRawData(fileType)
  if (!data) {
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }

  const mimeType = fileType === 'svg' ? 'image/svg+xml' : 'image/png'
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(await data.arrayBuffer())

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="qr-code.${fileType}"`,
    },
  })
})
