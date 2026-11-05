import { create } from 'zustand'
import { fallbackLng, supportedLngs } from '../lib/i18n/config'
interface LocaleState {
  locale: string | undefined
  setLocale: (locale: string) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: supportedLngs.includes(Intl.DateTimeFormat().resolvedOptions().locale)
    ? Intl.DateTimeFormat().resolvedOptions().locale
    : fallbackLng,
  setLocale: (locale: string) => set({ locale }),
}))
