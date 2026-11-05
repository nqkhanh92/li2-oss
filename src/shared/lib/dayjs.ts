import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/vi'
import { useTimeZoneStore } from '../stores/time-zone.store'
import { useLocaleStore } from '../stores/locale.store'
dayjs.extend(utc)
dayjs.extend(duration)
dayjs.extend(timezone)
dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

const defaultLocale = useLocaleStore.getState().locale
if (defaultLocale) {
  dayjs.locale(defaultLocale)
}
const defaultTz = useTimeZoneStore.getState().timezone
if (defaultTz) {
  dayjs.tz.setDefault(defaultTz)
}

useTimeZoneStore.subscribe((state) => {
  dayjs.tz.setDefault(state.timezone)
})

useLocaleStore.subscribe((state) => {
  dayjs.locale(state.locale)
})

const timezonedDayjs = (...args: any[]) => {
  return dayjs(...args).tz()
}
const timezonedUnix = (value: number) => {
  return dayjs.unix(value).tz()
}

timezonedDayjs.unix = timezonedUnix
timezonedDayjs.duration = dayjs.duration

export default timezonedDayjs
