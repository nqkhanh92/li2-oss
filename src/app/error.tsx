'use client'
import { Button } from '@/shared/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const goToHome = () => {
    router.push('/')
  }
  console.log({ error })

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow-md">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Something went wrong!</h1>

          <p className="text-lg text-gray-600">
            An unexpected error occurred. Please try again or return to the home page.
          </p>

          <div className="text-sm text-gray-500">{error.digest && `Error ID: ${error.digest}`}</div>

          <div className="pt-4 w-full space-y-3">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => reset()}
            >
              Try Again
            </Button>

            <Button variant="outline" className="w-full" onClick={goToHome}>
              Go to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} Li2.ai. All rights reserved.
        </p>
      </div>
    </div>
  )
}
