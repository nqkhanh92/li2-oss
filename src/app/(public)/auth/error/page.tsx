'use client'

import { useSearchParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { AlertCircle, RefreshCw, Mail } from 'lucide-react'
import Link from 'next/link'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'An unexpected error occurred during authentication'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription className="text-base">
            We encountered an issue while trying to sign you in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>You can try the following:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Wait a moment and try logging in again</li>
              <li>Clear your browser cache and cookies</li>
              <li>Try using a different browser</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/auth/login">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <a href="mailto:kan@li2.ai?subject=Authentication Error">
                <Mail className="mr-2 h-4 w-4" />
                Report Issue
              </a>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            If the problem persists, please contact our support team
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
