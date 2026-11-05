import { parse } from 'tldts'
import { z } from 'zod'
import { blackDestinationKeywords } from '../constants/blacklist-destination'

export const strictBoolean = z.preprocess((val) => {
  if (val === 'true') return true
  if (val === 'false') return false
  return val
}, z.boolean())

export const strictNumber = z.preprocess((val) => {
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val)
    if (!isNaN(parsed)) return parsed
  }
  if (typeof val === 'number') return val
  return undefined
}, z.number())

export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.type.startsWith('image/'), 'File must be an image')

// Auto-prepend https:// when scheme is missing
export const urlSchema = z
  .string()
  .trim()
  .transform((val) => (val && !/^https?:\/\//i.test(val) ? `https://${val}` : val))

// --- helpers (not exported) ---

const INVALID_URL_ERROR = {
  params: { i18n: { key: 'errors.invalid_url', params: { keyword: '' } } },
}

const checkUrl = (data: string, isOptional: boolean): boolean => {
  if (!data || data.length === 0) return isOptional
  try {
    const { domain, isIp } = parse(data, { allowPrivateDomains: false })
    return !!(domain || isIp)
  } catch {
    return false
  }
}

// Returns the matched blacklisted keyword, or null if none found
const findBlacklistedKeyword = (val: string): string | null => {
  if (!val) return null
  const lower = val.toLowerCase()
  return blackDestinationKeywords.find((kw) => lower.includes(kw.toLowerCase())) ?? null
}

const addBlacklistIssue = (val: string, ctx: z.RefinementCtx): void => {
  const blackWords = findBlacklistedKeyword(val)
  if (blackWords) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      params: { i18n: { key: 'errors.field_contain_blacklist', values: { blackWords } } },
    })
  }
}

// --- exports ---

export const requiredUrlSchema = urlSchema
  .refine((data) => checkUrl(data, false), INVALID_URL_ERROR)
  .superRefine(addBlacklistIssue)

export const optionalUrlSchema = urlSchema
  .refine((data) => checkUrl(data, true), INVALID_URL_ERROR)
  .superRefine(addBlacklistIssue)
