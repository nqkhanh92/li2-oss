'use client'

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { getDomain } from 'tldts'
import resourcesToBackend from 'i18next-resources-to-backend'
import { supportedLngs } from './config'
import { useLocaleStore } from '@/shared/stores/locale.store'

const i18nInstance = i18n
  .use(
    resourcesToBackend(
      // use .. instead of @/, current turpo have a bug with alias when using dynamic import
      (language: string, namespace: string) =>
        import(`../../../../public/lang/${language}/${namespace}.json`)
    )
  )
  .use(LanguageDetector)
  .use(initReactI18next)

i18nInstance.on('languageChanged', (lng) => {
  useLocaleStore.setState({ locale: lng })
  // Keep <html lang> in sync with the active locale. A lang/content mismatch
  // (e.g. lang="en" on Vietnamese content) makes browsers auto-translate the
  // page, mutating text nodes and crashing React's commit with
  // "NotFoundError: The object can not be found here." on text-heavy pages.
  if (typeof document !== 'undefined') document.documentElement.lang = lng
})

export function initTranslations(locale?: string) {
  const domain = getDomain(window.location.hostname)
  const cookieDomain = domain ? `.${getDomain(domain)}` : ''

  return i18nInstance
    .init({
      // lng: locale || "en",
      fallbackLng: 'en',
      supportedLngs: supportedLngs,
      preload: ['en'],
      load: 'currentOnly',
      ns: ['common'],
      debug: false,
      defaultNS: 'common',
      partialBundledLanguages: true,
      initImmediate: true,
      interpolation: {
        escapeValue: false,
        skipOnVariables: false,
      },
      react: {
        useSuspense: true,
      },
      detection: {
        order: ['cookie', 'localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
        caches: ['cookie', 'localStorage'],
        cookieDomain,
        cookieOptions: {
          domain: cookieDomain,
          maxAge: 60 * 60 * 24 * 30,
          secure: true,
          path: '/',
          sameSite: 'none',
          httpOnly: false,
        },
      },
    })
    .then(() => {
      // Set lang on first load too, in case detection resolved before the
      // languageChanged listener fired.
      if (typeof document !== 'undefined') {
        document.documentElement.lang = i18nInstance.resolvedLanguage ?? 'en'
      }
      return i18nInstance
    })
}

export default i18nInstance
