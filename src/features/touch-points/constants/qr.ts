import type { FileExtension, Gradient, Options } from 'qr-code-styling'
import miniLogo from '@/public/images/mini_logo_qr.svg'
import { getLi2IconSvg } from '@/shared/components/icons/li2-icon'
export type QrOptions = {
  rawData?: string
  formValues?: Record<string, any>
  frame?: string
  margin?: number
  footerImage?: string
} & Options

export interface IDotsOptions {
  color: string
  gradient: Gradient
  type: 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded'
}

const loadImageAsDataURL = async (image: string): Promise<string> => {
  try {
    // If the image is an SVG or compatible format, it can be used directly as a data URL
    const response = await fetch(image)
    const blob = await response.blob()
    return new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting image to data URL:', error)
    return ''
  }
}

// Extension (asynchronous version)
// export const createExtensionWithBase64Logo = async (): Promise<
//   (svg: SVGElement, options: QrOptions) => void
// > => {
//   const logoDataUrl = await loadImageAsDataURL(miniLogo.src);

//   return (svg: SVGElement, options: QrOptions) => {
//     const { width = 300, height = 300 } = options;
//     const logoSize = width * 0.2;
//     const padding = 0;

//     const x = width - logoSize - padding;
//     const y = height - logoSize * 0.65 - padding;

//     const logo = document.createElementNS(
//       "http://www.w3.org/2000/svg",
//       "g"
//     );
//     logo.setAttributeNS(null, "href", logoDataUrl);
//     logo.setAttribute("width", String(logoSize));
//     logo.setAttribute("height", String(logoSize));
//     logo.setAttribute("x", String(x));
//     logo.setAttribute("y", String(y));
//     logo.setAttribute("preserveAspectRatio", "xMidYMid meet");

//     svg.appendChild(logo);
//   };
// };

export const createExtensionWithBase64Logo = async (): Promise<
  (svg: SVGElement, options: QrOptions) => void
> => {
  return (svg: SVGElement, options: QrOptions) => {
    const { width = 300, height = 300 } = options
    const logoSize = width * 0.2
    const padding = 0

    const x = width - logoSize - padding
    const y = height - logoSize * 0.65 - padding
    const li2IconSvg = getLi2IconSvg({ logoSize, xCor: x, yCor: y })
    const parser = new DOMParser()
    const doc = parser.parseFromString(li2IconSvg, 'image/svg+xml')
    const li2IconElement = doc.documentElement

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.appendChild(li2IconElement)

    svg.appendChild(group)
  }
}

export const extension = (svg: SVGElement, options: QrOptions) => {
  const { width = 300, height = 300 } = options
  const logoSize = Math.max(width * 0.25, 12)
  const padding = 0

  // const logo = document.createElementNS("http://www.w3.org/2000/svg", "image");
  // logo.setAttributeNS(null, "href", miniLogo.src);
  // logo.setAttributeNS(null, "width", String(logoSize));
  // logo.setAttributeNS(null, "height", String(logoSize));
  // logo.setAttributeNS(null, "x", String(width! - logoSize * 1 - padding));
  // logo.setAttributeNS(null, "y", String(height! - logoSize * 0.65 - padding));
  // logo.setAttributeNS(null, "preserveAspectRatio", "xMidYMid meet");
  // svg.appendChild(logo);

  const x = width! - logoSize - padding
  const y = height! - logoSize * 0.65 - padding
  const li2IconSvg = getLi2IconSvg({ logoSize, xCor: x, yCor: y })
  const parser = new DOMParser()
  const doc = parser.parseFromString(li2IconSvg, 'image/svg+xml')
  const li2IconElement = doc.documentElement

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  group.appendChild(li2IconElement)

  svg.appendChild(group)
}

export const DEFAULT_QR_OPTIONS: QrOptions = {
  rawData: 'https://li2.ai',
  width: 300,
  height: 300,
  data: 'https://li2.ai',
  image: undefined,
  dotsOptions: {
    color: '#000D27',
    type: 'rounded',
  },
  qrOptions: {
    typeNumber: 5,
    errorCorrectionLevel: 'Q',
  },
  imageOptions: {
    crossOrigin: 'anonymous',
    hideBackgroundDots: false,
    margin: 0,
    imageSize: 0.4,
  },
  cornersDotOptions: {
    type: 'rounded',
  },
  cornersSquareOptions: {
    type: 'rounded',
  },
}

export interface QrDownloadOption {
  id: number
  fileType: FileExtension
  fileSize: number
  spacer: boolean
  note: string
  sizeInText: string
}

export const availableQrOptions: QrDownloadOption[] = [
  {
    id: 0,
    fileType: 'png',
    fileSize: 512,
    spacer: false,
    note: 'touchpoint:labels.recommended',
    sizeInText: '',
  },
  {
    id: 1,
    fileType: 'png',
    fileSize: 1024,
    spacer: false,
    note: '',
    sizeInText: '',
  },
  {
    id: 2,
    fileType: 'png',
    fileSize: 2048,
    spacer: false,
    note: '',
    sizeInText: '',
  },
  {
    id: 3,
    fileType: 'svg',
    fileSize: 512,
    spacer: true,
    note: '',
    sizeInText: '(vector)',
  },
]
