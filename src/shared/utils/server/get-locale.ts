import { fallbackLng, supportedLngs } from '@/shared/lib/i18n/config'
import { cookies } from 'next/headers'

export const getLocale = (): string => {
  const cookieStore = cookies()
  const localeFromCookie = cookieStore.get('i18next')?.value
  const lng = supportedLngs.includes(localeFromCookie || '') ? localeFromCookie : fallbackLng
  return lng ?? fallbackLng
}
