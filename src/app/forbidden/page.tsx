'use client'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Forbidden() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow-md">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Access Forbidden</h1>

          <p className="text-lg text-gray-600">
            Sorry, you don't have permission to access this page.
          </p>

          <div className="text-sm text-gray-500">Error code: 403</div>

          <div className="pt-4 w-full">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push('/')}
            >
              Back to Home
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
