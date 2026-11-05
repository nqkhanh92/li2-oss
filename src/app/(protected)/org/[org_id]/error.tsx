'use client'

import { logSystemError } from '@/app/actions/client-error-logger'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function OrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const hasLoggedRef = useRef(false)
  const pathname = usePathname()
  useEffect(() => {
    if (hasLoggedRef.current) return
    hasLoggedRef.current = true
    async function logError() {
      await logSystemError(
        {
          message: error.message,
          stack: error.stack || '',
          name: error.name,
        },
        pathname
      )
    }
    logError()
  }, [])
  return (
    <div className="flex items-start justify-center h-full w-full">
      <div className="p-6 flex flex-col gap-6 bg-card rounded-[16px] lg:w-[700px]">
        <Alert size={'lg'} variant={'destructive'}>
          <AlertTitle>An error occurred</AlertTitle>
          <AlertDescription>
            We are sorry for the inconvenience. Please try again later or contact support.
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Error Digest: {error.digest}</p>
            </div>
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 justify-center">
          <Button variant="default" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
