import { useState, useTransition } from 'react'

/**
 * Hook to manage URL verification state
 * Returns verification status and utilities to update it
 */
export const useUrlVerification = () => {
  const [urlVerification, setUrlVerification] = useState<boolean | null>(null)
  const [isVerifying, startVerification] = useTransition()

  const verifyUrl = (url: string, callback: (isValid: boolean) => void) => {
    startVerification(() => {
      callback(true)
    })
  }

  return {
    urlVerification,
    isVerifying,
    setUrlVerification,
    verifyUrl,
  }
}
