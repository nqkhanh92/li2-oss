'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const RegisterClient = ({ registerUrl }: { registerUrl: string }) => {
  const router = useRouter()

  useEffect(() => {
    router.push(registerUrl)
  }, [])

  return null
}
