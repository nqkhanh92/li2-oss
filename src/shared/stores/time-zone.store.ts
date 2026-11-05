import { create } from 'zustand'
interface TimeZoneState {
  timezone: string | undefined
  setTimezone: (timezone: string) => void
}

export const useTimeZoneStore = create<TimeZoneState>((set) => ({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  setTimezone: (timezone: string) => set({ timezone }),
}))
