import { useCallback } from 'react'
import type React from 'react'
import { captureThumbnail } from '../utils/capture-thumbnail'
import { uploadDashboardThumbnail } from '@/shared/lib/storage/upload'

export function useCaptureThumbnail(
  dashboardId: string,
  gridRef: React.RefObject<HTMLElement | null>,
) {
  const triggerCapture = useCallback(() => {
    const element = gridRef.current
    if (!element) return

    // Fire-and-forget: never blocks the caller
    captureThumbnail(element)
      .then((blob) => {
        if (!blob) return
        return blob.arrayBuffer().then((buf) =>
          uploadDashboardThumbnail(dashboardId, new Uint8Array(buf))
        )
      })
      .catch(() => {
        // Silently swallow — thumbnail is non-critical
      })
  }, [dashboardId, gridRef])

  return { triggerCapture }
}
