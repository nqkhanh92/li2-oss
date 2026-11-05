'use client'

import { I18nextProvider } from 'react-i18next'
import type { i18n as I18nType } from 'i18next'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { initTranslations } from '@/shared/lib/i18n/i18n-client'

export default function TranslationsProvider({
  children,
  locale,
}: {
  children: React.ReactNode
  locale?: string
}) {
  const router = useRouter()
  const [i18nInstance, setI18nInstance] = useState<I18nType | null>(null)
  useEffect(() => {
    const handler = (lng: string) => {
      router.refresh()
    }

    i18nInstance?.on('languageChanged', handler)

    return () => {
      i18nInstance?.off('languageChanged', handler) // cleanup
    }
  }, [router, i18nInstance])
  useEffect(() => {
    const handler = (lng: string) => {
      router.refresh()
    }

    i18nInstance?.on('languageChanged', handler)

    return () => {
      i18nInstance?.off('languageChanged', handler) // cleanup
    }
  }, [router, i18nInstance])

  useEffect(() => {
    initTranslations(locale).then(setI18nInstance)
  }, [locale])

  if (!i18nInstance) {
    return <></>
  }

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>
}
