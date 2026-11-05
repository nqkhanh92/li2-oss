'use client'

import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

export function BackButton({ className }: { className?: string }) {
  return (
    <Button
      size="lg"
      variant="secondary"
      onClick={() => window.history.back()}
      className={className}
    >
      <ArrowLeftIcon className="mr-2 h-5 w-5" />
      Go Back
    </Button>
  )
}
