import { toBlob } from 'html-to-image'

/**
 * Captures a DOM element as a WebP blob.
 * Returns null on failure — callers must treat this as fire-and-forget.
 */
export async function captureThumbnail(element: HTMLElement): Promise<Blob | null> {
  try {
    const blob = await toBlob(element, {
      type: 'image/webp',
      quality: 0.75,
      skipFonts: true,
      cacheBust: false,
    })
    return blob
  } catch {
    return null
  }
}
