import { useRef, useCallback, useEffect } from 'react'
import axios, { AxiosError, CancelTokenSource } from 'axios'

type SaveFunction<T> = (
  data: T,
  config: { cancelToken: CancelTokenSource['token'] }
) => Promise<any>

interface UseDebouncedMutationReturn<T> {
  debounceMutation: (data: T) => void
  cancel: () => void
}

function useDebouncedMutation<T = any>(
  saveFunction: SaveFunction<T>,
  delay: number = 300
): UseDebouncedMutationReturn<T> {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cancelTokenSourceRef = useRef<CancelTokenSource | null>(null)

  const debounceMutation = useCallback(
    (data: T) => {
      // Cancel any pending save request
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('New save initiated')
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        cancelTokenSourceRef.current = axios.CancelToken.source()

        try {
          await saveFunction(data, {
            cancelToken: cancelTokenSourceRef.current.token,
          })
          console.log('Save successful')
        } catch (error) {
          if (axios.isCancel(error)) {
            console.log('Save request was cancelled:', (error as Error).message)
          } else {
            console.error('Save failed:', error)
          }
        }
      }, delay)
    },
    [saveFunction, delay]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('Component unmounted')
      }
    }
  }, [])

  // Cancel function to manually abort
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (cancelTokenSourceRef.current) {
      cancelTokenSourceRef.current.cancel('Manually cancelled')
    }
  }, [])

  return { debounceMutation, cancel }
}

export default useDebouncedMutation
