'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface KeyDisplayProps {
  publishableKey: string
}

export const KeyDisplay = ({ publishableKey }: KeyDisplayProps) => {
  const { t } = useTranslation('analytics_settings')
  const [copied, setCopied] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(publishableKey)
    setCopied(true)
    toast.success(t('publishable_key.copied'))
    setTimeout(() => setCopied(false), 2000)
  }

  // Mask the key for display
  const maskedKey = publishableKey
    ? `${publishableKey.slice(0, 12)}${'*'.repeat(20)}${publishableKey.slice(-8)}`
    : ''

  return (
    <div className="relative flex-1">
      <Input
        value={showKey ? publishableKey : maskedKey}
        readOnly
        className="pr-20 font-mono text-sm"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowKey(!showKey)}
          title={showKey ? t('publishable_key.hide_key') : t('publishable_key.show_key')}
        >
          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
          title={t('publishable_key.copy_key')}
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
