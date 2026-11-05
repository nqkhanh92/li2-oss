import { clsx, type ClassValue } from 'clsx'
import { NextRequest } from 'next/server'
import { twMerge } from 'tailwind-merge'
import qs from 'qs'
import { SearchFilterPagination } from '@/shared/types'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import axios from 'axios'
import { defaultMetaTags } from '@/shared/constants'
import { parse } from 'tldts'
import { z } from 'zod'
import { FileExtension, Options } from 'qr-code-styling'
import { sampleTagColors } from '../constants/sample-data'
import { axiosApiInstance } from './axios'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function dateComparator(date1: Date, date2: Date) {
  return date1.getTime() - date2.getTime()
}

export const getQueryParams = (req: NextRequest): Record<string, any> => {
  const searchParams = req.nextUrl.searchParams.toString()
  const paramsObject = qs.parse(searchParams) // Automatically parses nested keys into an object
  return paramsObject
}
export const queryBuilderByParams = (
  query: PostgrestFilterBuilder<any, any, any>,
  params: SearchFilterPagination
) => {
  if (params?.pagination?.pageSize) {
    const pageSize = parseInt(`${params.pagination.pageSize}`)
    const pageIndex = parseInt(`${params.pagination.pageIndex}`) || 0
    const from = pageIndex * pageSize
    const to = (pageIndex + 1) * pageSize - 1
    query = query.range(from, to)
  }
  if (params?.sorting?.length > 0) {
    const sort = params.sorting[0]
    const desc = toBoolean(sort?.desc)

    query = query.order(sort.id, { ascending: !desc })
  }
  if (params?.filters) {
    // Handle created_at date range filter
    if (params.filters?.created_at?.from) {
      const from = new Date(parseInt(params.filters.created_at.from)).toISOString()
      query = query.gte('created_at', from)
      delete params.filters?.created_at.from
    }
    if (params.filters?.created_at?.to) {
      const to = new Date(parseInt(params.filters.created_at.to)).toISOString()
      query = query.lte('created_at', to)
      delete params.filters?.created_at.to
    }
    delete params.filters?.created_at

    if (params.filters?.excludeIds && Array.isArray(params.filters.excludeIds)) {
      query = query.not('id', 'in', `(${params.filters.excludeIds.join(',')})`)
    }
    delete params.filters?.excludeIds

    // Helper function to convert string booleans to actual booleans in nested objects
    const parseNestedBooleans = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(parseNestedBooleans)
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.entries(obj).reduce((acc, [k, v]) => {
          acc[k] = parseNestedBooleans(v)
          return acc
        }, {} as any)
      }
      if (obj === 'true') return true
      if (obj === 'false') return false
      return obj
    }

    // Process remaining filters
    const filters = Object.entries(params.filters).reduce((acc, [key, value]) => {
      // Handle array filters with IN operator
      if (Array.isArray(value)) {
        query = query.in(key, value)
        return acc
      }

      // Handle nested object filters (JSONB columns)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Parse string booleans to actual booleans before stringifying
        const parsedValue = parseNestedBooleans(value)
        // Use @> operator for JSONB containment
        query = query.filter(key, 'cs', JSON.stringify(parsedValue))
        return acc
      }

      // Handle boolean filters with eq operator
      if (typeof value === 'boolean') {
        query = query.eq(key, value)
        return acc
      }

      // Handle simple equality filters (strings, numbers)
      return { ...acc, [key]: value }
    }, {} as Record<string, any>)

    // Apply remaining simple filters with match
    if (Object.keys(filters).length > 0) {
      query = query.match(filters)
    }
  }
  return query
}

export const queryBuilder = (query: PostgrestFilterBuilder<any, any, any>, req: NextRequest) => {
  const params = getQueryParams(req) as unknown as SearchFilterPagination
  return queryBuilderByParams(query, params)
}

export function getShortCode(url: string) {
  const pathname = new URL(url).pathname
  return pathname.split('/')[1] // Get the first part after the domain
}

export function isNullOrEmpty(value: any) {
  if (value == null) return true // Covers null and undefined
  if (typeof value === 'string' && value.trim() === '') return true // Empty string
  if (Array.isArray(value) && value.length === 0) return true // Empty array
  if (typeof value === 'object' && Object.keys(value).length === 0) return true // Empty object

  return false
}

export function groupByKey<T>(arr: T[], keyPath: keyof T | string): Map<string, T[]> {
  return arr.reduce((map, item) => {
    // Extract the key dynamically (supports nested keys like "groups.id")
    const key = (keyPath as string)
      .split('.')
      .reduce((obj, key) => (obj as any)?.[key], item) as string

    if (key !== undefined) {
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(item)
    }

    return map
  }, new Map<string, T[]>())
}
export function array2Object<T>(arr: T[], keyPath: keyof T | string): Record<string, T> {
  return arr.reduce((map, item) => {
    const key = (keyPath as string)
      .split('.')
      .reduce((obj, key) => (obj as any)?.[key], item) as string
    map[key] = item
    return map
  }, {} as Record<string, T>)
}

export function hexToRGBA(hex: string, opacity: number) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b)
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}, ${opacity})`
    : hex
}
export function mergeArrayObject<T extends Record<string, any>>(
  arr1: T[],
  arr2: T[],
  valueKey: keyof T,
  nameKey: keyof T
): T[] {
  const map = new Map<string, number>()

  ;[...arr1, ...arr2].forEach((item) => {
    const name = String(item[nameKey])
    const value = Number(item[valueKey])

    map.set(name, (map.get(name) || 0) + value)
  })

  return Array.from(map.entries())?.map(([name, count]) => ({
    [nameKey]: name,
    [valueKey]: count,
  })) as T[]
}

export async function getMetaTagsFromUrl(url: string): Promise<Record<string, string | boolean>> {
  const metaTags: Record<string, string> = {}

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0', // Helps avoid some bot blocks
      },
      timeout: 10000,
    })
    const html = response.data

    // Regex to match meta tags
    const metaTagRegex = /<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"/gi
    let match

    while ((match = metaTagRegex.exec(html)) !== null) {
      const [, name, content] = match
      if (['og:title', 'og:description', 'og:image', 'og:site_name'].includes(name)) {
        metaTags[name.replace(/^og:/, '')] = content
      }
    }
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1]
    const result: Record<string, string> = {
      ...metaTags,
      title: metaTags['title'] || title || metaTags['site_name'],
    }
    if ('title' in result && result.title.length > 60) {
      result.title = `${result.title.slice(0, 56)}...`
    }
    if ('description' in result && result.description.length > 160) {
      result.description = `${result.description.slice(0, 156)}...`
    }

    return result
  } catch (error) {
    console.error('Failed to fetch meta tags: ', error)
    return Object.assign({}, defaultMetaTags)
  }
}

export const validateUrl = (data?: string) => {
  try {
    if (!data) return false

    const parsed = parse(data, {
      allowPrivateDomains: false,
    })
    if (!parsed.domain && !parsed.isIp) return false

    return true
  } catch (error) {
    return false
  }
}

export function getZodDefaults<Schema extends z.AnyZodObject>(schema: Schema) {
  return Object.fromEntries(
    Object.entries(schema.shape).map(([key, value]) => {
      if (value instanceof z.ZodDefault) {
        return [key, value._def.defaultValue()]
      }
      return [key, undefined] // Or handle other cases as needed
    })
  )
}
export function getMaxLength(schema: z.ZodTypeAny): number | undefined {
  const hasMaxLength = z.object({ maxLength: z.number() }).safeParse(schema)
  if (hasMaxLength.success) return hasMaxLength.data.maxLength

  if ('unwrap' in schema && typeof schema.unwrap === 'function')
    return getMaxLength(schema.unwrap())
}

export async function makeCircleImage(
  input: File | string,
  outlineWidth: number = 0
): Promise<{ file: File; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    let objectUrl: string | null = null

    // Handle different input types
    if (typeof input === 'string') {
      // It's a URL string
      img.crossOrigin = 'anonymous'
      img.src = input
    } else {
      // It's a File object
      objectUrl = URL.createObjectURL(input)
      img.src = objectUrl
    }

    img.onload = () => {
      try {
        const targetSize = 128 // Fixed size for consistent outline
        const canvas = document.createElement('canvas')
        canvas.width = targetSize
        canvas.height = targetSize

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          // Clean up object URL if it was created
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl)
          }
          reject(new Error('Canvas not supported'))
          return
        }

        // Clear canvas with transparent background
        ctx.clearRect(0, 0, targetSize, targetSize)

        // Calculate dimensions to maintain aspect ratio
        const centerX = targetSize / 2
        const centerY = targetSize / 2
        const radius = targetSize / 2 - outlineWidth

        // Draw white outline if outlineWidth is greater than 0
        if (outlineWidth > 0) {
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius + outlineWidth, 0, Math.PI * 2)
          ctx.fillStyle = 'white'
          ctx.fill()
        }

        // Create clipping path for the image
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()

        // Calculate source dimensions to maintain aspect ratio
        const sourceAspect = img.width / img.height
        let drawWidth = targetSize
        let drawHeight = targetSize
        let offsetX = 0
        let offsetY = 0

        if (sourceAspect > 1) {
          // Image is wider than tall
          drawHeight = targetSize / sourceAspect
          offsetY = (targetSize - drawHeight) / 2
        } else {
          // Image is taller than wide or square
          drawWidth = targetSize * sourceAspect
          offsetX = (targetSize - drawWidth) / 2
        }

        // Draw the image centered and cropped to fit the circle
        ctx.drawImage(img, 0, 0, img.width, img.height, offsetX, offsetY, drawWidth, drawHeight)

        // Convert canvas to blob and create file
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Clean up object URL if it was created
              if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
              }
              reject(new Error('Failed to create blob'))
              return
            }

            // Create a File object from the blob
            const circleFile = new File([blob], `circle-image_${Date.now()}.png`, {
              type: 'image/png',
              lastModified: Date.now(),
            })

            // Create object URL for the canvas
            const circleUrl = canvas.toDataURL('image/png')

            resolve({
              file: circleFile,
              url: circleUrl,
            })

            // Clean up object URL if it was created
            if (objectUrl) {
              URL.revokeObjectURL(objectUrl)
            }
          },
          'image/png',
          0.9
        ) // High quality PNG
      } catch (error) {
        // Clean up object URL if it was created
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
        }
        reject(error)
      }
    }

    img.onerror = (error) => {
      // Clean up object URL if it was created
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }

      const errorMessage =
        typeof input === 'string'
          ? `Failed to load image from URL: ${input}`
          : `Failed to load image from file: ${input.name}`

      reject(new Error(`${errorMessage}. ${error}`))
    }
  })
}

export function toBlobPart(data: Blob | Buffer | ArrayBufferLike): BlobPart {
  if (data instanceof Blob) {
    return data
  }
  if (data instanceof Buffer) {
    return new Uint8Array(data) // hợp lệ BlobPart
  }
  return data as ArrayBuffer // cast từ ArrayBufferLike
}

export const toBoolean = (val: any): boolean => {
  if (typeof val === 'boolean') return val
  if (typeof val === 'string') {
    const lowered = val.trim().toLowerCase()
    if (['true', '1', 'yes'].includes(lowered)) return true
    if (['false', '0', 'no'].includes(lowered)) return false
  }
  return Boolean(val)
}

export const compareQrOptions = (qrOptions: object, newOptions: object) => {
  const checkFields = [
    'image',
    'width',
    'height',
    'data',
    'dotsOptions.type',
    'dotsOptions.color',
    'cornersSquareOptions.type',
    'cornersDotOptions.type',
    'imageOptions.imageSize',
    'imageOptions.crossOrigin',
    'imageOptions.hideBackgroundDots',
    'imageOptions.margin',
  ]

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  for (const field of checkFields) {
    const oldValue = getNestedValue(qrOptions, field)
    const newValue = getNestedValue(newOptions, field)

    if (oldValue !== newValue) {
      return false // Values are different
    }
  }

  return true // All checked fields are equal
}

interface FieldChange {
  old: any
  new: any
}

type ObjectDiff = Record<string, FieldChange>

export function getObjectDiff(obj1: Record<string, any>, obj2: Record<string, any>): ObjectDiff {
  const diff: ObjectDiff = {}

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)])

  for (const key of allKeys) {
    const val1 = obj1[key]
    const val2 = obj2[key]

    // Compare values - works for added (val1 undefined), removed (val2 undefined), or modified
    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      diff[key] = {
        old: val1,
        new: val2,
      }
    }
  }

  return diff
}

export function getChangedFields(
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): Record<string, any> {
  const changes: Record<string, any> = {}

  // Only check keys that exist in the new object
  const newKeys = Object.keys(newObj)

  for (const key of newKeys) {
    const oldValue = oldObj[key]
    const newValue = newObj[key]

    // Check if values are different
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      // If the new value is an object/array, include the full nested structure
      changes[key] = newValue
    }
  }

  return changes
}

export const getRandomSampleColors = () => {
  return sampleTagColors[Math.floor(Math.random() * sampleTagColors.length)]
}

export const isSafari = () => {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

export const downloadQrViaApi = async (qrOptions: Options, fileType: FileExtension = 'png') => {
  const response = await axiosApiInstance.post(
    '/public/download-qr',
    { qrOptions, fileType },
    { responseType: 'blob' }
  )

  const blob = new Blob([response.data], {
    type: fileType === 'svg' ? 'image/svg+xml' : 'image/png',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `qr-code-${new Date().getTime()}.${fileType}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
