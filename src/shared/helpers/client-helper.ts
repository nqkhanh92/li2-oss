import QRCodeStyling, { Options } from 'qr-code-styling'
import { toBlobPart } from '../lib/utils'
import { ReactNode } from 'react'

export const writeQrToClipboard = async (qrOptions: Options | any) => {
  const options: Options = {
    ...qrOptions,
    type: 'canvas',
    width: 512,
    height: 512,
  }
  const rawData = await new QRCodeStyling(options).getRawData('png')
  if (!rawData) return
  const imageBlob = new Blob([toBlobPart(rawData)], { type: 'image/png' })
  navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob })])
}
export function nodeToText(node: ReactNode): string {
  if (node == null) return ''

  if (typeof node === 'string' || typeof node === 'number') {
    return node.toString()
  }

  if (Array.isArray(node)) {
    return node.map(nodeToText).join('')
  }

  if (typeof node === 'object' && 'props' in (node as any)) {
    return nodeToText((node as any).props.children)
  }

  return ''
}
