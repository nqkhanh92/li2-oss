import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import { getTimeZone } from './get-timezone'
import { getLocale } from './get-locale'

dayjs.extend(utc)
dayjs.extend(duration)
dayjs.extend(timezone)
dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
export const getServerDateTimeConfig = () => {
  const timezone = getTimeZone()

  const locale = getLocale()
  return { timezone, locale }
}

export const serverDayjs = (date?: string | number | Date | dayjs.Dayjs) => {
  const config = getServerDateTimeConfig()
  dayjs.locale(config.locale)
  dayjs.tz.setDefault(config.timezone)
  return date ? dayjs.tz(date) : dayjs.tz()
}
