import { createCanvas, loadImage } from 'canvas'
import { getLi2IconSvg } from '@/shared/components/icons/li2-icon'
import { QrOptions } from '@/features/touch-points/constants/qr'
import { JSDOM } from 'jsdom'

// Example: add SVG logo before saving QR code
export async function addSvgOverlayToQr(buffer: Buffer, options: QrOptions) {
  // Parse SVG
  const { width = 24, height = 24 } = options
  const padding = 0

  const logoSize = width * 0.2
  const x = width! - logoSize - padding
  const y = height! - logoSize * 0.65 - padding
  const li2IconSvg = getLi2IconSvg({ logoSize, xCor: x, yCor: y })

  // Convert SVG string to image
  const svgBuffer = Buffer.from(li2IconSvg)
  const svgDataUri = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`
  const svgImage = await loadImage(svgDataUri)

  // Load QR buffer as image
  const qrImage = await loadImage(buffer)

  // Create new canvas
  const canvas = createCanvas(qrImage.width, qrImage.height)
  const ctx = canvas.getContext('2d')

  // Draw QR first
  ctx.drawImage(qrImage, 0, 0)

  // Overlay SVG logo in center (example: 20% size of QR)
  ctx.drawImage(svgImage, x, y, logoSize, logoSize)

  // Return new buffer (PNG)
  return canvas.toBuffer('image/png')
}

export async function addWatermark(qrImage: Blob | Buffer | ArrayBufferLike | null) {
  if (!qrImage) throw new Error('qrImage is null')

  const buf = Buffer.isBuffer(qrImage)
    ? qrImage
    : new Uint8Array(await (qrImage as Blob).arrayBuffer())

  const svgStr = buf.toString()
  const dom = new JSDOM(svgStr, { contentType: 'image/svg+xml' })
  const doc = dom.window.document
  const root = doc.documentElement

  const vb = root.getAttribute('viewBox')?.split(/\s+/).map(Number) ?? [0, 0, 512, 512]
  const [, , width, height] = vb

  const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g')

  // Calculate text dimensions for proper positioning
  const textPadding = 1
  const textContent = 'Li2.ai'
  const textSize = 8
  const textHeight = textSize * 1.2 // Approximate line height
  const textWidth = textContent.length * (textSize * 0.6) // Approximate character width

  // Create background rectangle with padding
  const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('x', String(width - textWidth - textPadding * 2))
  rect.setAttribute('y', String(height - textHeight - textPadding * 2))
  rect.setAttribute('width', String(textWidth + textPadding * 2))
  rect.setAttribute('height', String(textHeight + textPadding * 2))
  rect.setAttribute('fill', 'white')

  // Create text element with centered text
  const text = doc.createElementNS('http://www.w3.org/2000/svg', 'text')
  const rectX = width - textWidth - textPadding * 2
  const centerX = rectX + (textWidth + textPadding * 2) / 2
  text.setAttribute('x', String(centerX))
  text.setAttribute('y', String(height - textPadding - textHeight / 2 + textSize / 3)) // Center text vertically
  text.setAttribute('text-anchor', 'middle') // Center text horizontally
  text.setAttribute('font-size', String(textSize))
  text.setAttribute('font-family', 'sans-serif')
  text.setAttribute('font-weight', 'bold')
  text.setAttribute('fill', 'black')
  text.textContent = textContent

  g.append(rect, text)
  root.appendChild(g)

  const out = root.outerHTML
  return new Blob([out], { type: 'image/svg+xml' })
}
