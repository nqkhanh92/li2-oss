import { useState, useEffect } from 'react'

interface CannySSOResponse {
  data: {
    ssoToken: string
  }
}

export const useCannySso = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const [ssoToken, setSsoToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSsoToken = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/auth/sso/canny', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch SSO token')
      }

      const data: CannySSOResponse = await response.json()
      setSsoToken(data.data.ssoToken)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setSsoToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) return
    fetchSsoToken()
  }, [enabled])

  return { ssoToken, isLoading, error, refetch: fetchSsoToken }
}
