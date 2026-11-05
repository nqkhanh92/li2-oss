'use client'

import { Button } from '@/shared/components/ui/button'
import { ShieldBan, Mail } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { Suspense } from 'react'

function BannedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const handleLogout = async () => {
    await logout()
    router.replace('/auth/login')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg w-full space-y-8 p-8 bg-card rounded-lg shadow-md">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Icon */}
          <div className="rounded-full bg-red-100 p-4">
            <ShieldBan className="h-14 w-14 text-red-600" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Account Suspended</h1>
            <p className="text-sm font-medium text-red-600 uppercase tracking-widest">
              Policy Violation
            </p>
          </div>

          {/* Description */}
          <p className="text-base text-gray-600 leading-relaxed">
            Your account has been suspended due to a violation of our{' '}
            <span className="font-semibold text-gray-800">Terms of Service</span> or{' '}
            <span className="font-semibold text-gray-800">Acceptable Use Policy</span>.
          </p>

          {/* Reason box (optional) */}
          {reason && (
            <div className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">
                Reason
              </p>
              <p className="text-sm text-red-700">{reason}</p>
            </div>
          )}

          {/* Info */}
          <div className="w-full rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-left space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
              What can you do?
            </p>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>Review our Terms of Service for details on prohibited activities.</li>
              <li>
                If you believe this is a mistake, please contact our support team. Email:{' '}
                <a href="mailto:kan@li2.ai" className="font-medium underline">
                  kan@li2.ai
                </a>
              </li>
              <li>Appeals are reviewed within 3–5 business days.</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="w-full space-y-3 pt-2">
            <a
              href="mailto:kan@li2.ai?subject=Account%20Suspension%20Appeal"
              className="flex items-center justify-center gap-2 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Contact Support · kan@li2.ai
            </a>
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              Sign Out
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

export default function BannedPage() {
  return (
    <Suspense>
      <BannedContent />
    </Suspense>
  )
}
