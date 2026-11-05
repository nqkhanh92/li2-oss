'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const LoginClient = ({ loginUrl }: { loginUrl: string }) => {
  const router = useRouter()

  useEffect(() => {
    router.push(loginUrl)
  }, [])

  return null
}
