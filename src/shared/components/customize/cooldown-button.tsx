import { Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { useEffect, useState } from 'react'
import { useCooldown } from '@/shared/hooks/use-cooldown'
import { useCooldownButtonStore } from '@/shared/stores/cooldown-button-store'

type CooldownButtonProps = {
  disabled?: boolean
  cooldownUntil: Date | null
  loading?: boolean
  cooldown?: {
    duration: number
    key: string
  }
} & React.ComponentProps<typeof Button>

export const CooldownButton = ({
  cooldownUntil,
  loading,
  cooldown,
  ...props
}: CooldownButtonProps) => {
  const cooldownButtonStore = useCooldownButtonStore()
  const cooldownUntilFromStore = cooldown?.key
    ? cooldownButtonStore.cooldownUntil.get(cooldown.key)
    : null
  const { isCooldown, remaining } = useCooldown(cooldownUntilFromStore ?? cooldownUntil)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (cooldown && cooldown.key && cooldown.duration) {
      cooldownButtonStore.setCooldownUntil(cooldown.key, new Date(Date.now() + cooldown.duration))
    }
    props.onClick?.(event)
  }

  return (
    <Button {...props} disabled={props.disabled || isCooldown || loading} onClick={handleClick}>
      {props.children}
      {isCooldown ? '(' + remaining + 's)' : ''}
      {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
    </Button>
  )
}
