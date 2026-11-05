'use client'

import { QQuikIdentity } from '@qquik-identity/core'
import React, { useEffect } from 'react'
import { identityStore } from '../stores/identity-store'
import { isOpenObserveEnabled } from '@/infrastructure/logging/open-observe/config'
import { initializeOpenObserve } from '@/infrastructure/logging/open-observe/rum'
import { useOpenObserve } from '@/shared/hooks/use-open-observe'
import { authStore } from '../stores/profile-store'
import { usePathname } from 'next/navigation'

export default function IdentityProvider({
  children,
  baseUrl,
}: {
  children?: React.ReactNode
  baseUrl?: string
}) {
  const setUid = identityStore((state) => state.setUid)
  const setFp = identityStore((state) => state.setFp)
  const uid = identityStore((state) => state.uid)
  const fp = identityStore((state) => state.fp)

  const profile = authStore((state) => state.profile)

  const { trackUser, addContext } = useOpenObserve()

  useEffect(() => {
    async function initIdentity() {
      try {
        const identity = new QQuikIdentity({
          apiKey: process.env.NEXT_PUBLIC_IDENTITY_API_KEY!,
          ...(baseUrl && { baseUrl }),
        })
        const uid = await identity.getUid({ collectDeviceInfo: true })
        const fp = await identity.getFingerprint()
        setUid(uid)
        setFp(fp)
      } catch (e) {
        console.info('Identity init failed', e)
      }
    }
    initIdentity()
  }, [])

  useEffect(() => {
    if (isOpenObserveEnabled()) {
      initializeOpenObserve()
    }
  }, [])

  const path = usePathname()

  useEffect(() => {
    if (uid && fp && isOpenObserveEnabled()) {
      addContext('page', path)

      const user = {
        id: profile?.id,
        name: profile?.name || 'Guest',
        email: profile?.email,
        fp: fp,
        uid: uid,
      }

      trackUser(user)
    }
  }, [profile, fp, uid, path])

  // useEffect(() => {
  //   if (uid && fp) {
  //     addContext('page', 'homepage')

  //     const userId = `${uid}_${fp}`
  //     const user = {
  //       id: userId,
  //       name: profile?.name || 'Guest',
  //       email: profile?.email,
  //       li2_id: profile?.id
  //     }

  //     trackUser(user)
  //   }
  // }, [uid, fp, trackUser, addContext])

  return <>{children}</>
}
