'use server'

import {
  AppError,
  BadRequestError,
  UnauthorizedError,
} from '@/infrastructure/response/errors/domain.errors'
import { createClient } from '../../../infrastructure/database/supabase/client'
import { createServiceClient } from '../../../infrastructure/database/supabase/server'
import { getSession } from '@/shared/lib/auth/session'
import { requestContext } from '@/shared/types/request'
import { fileTypeFromBlob, fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'
import Papa from 'papaparse'
import { z } from 'zod'
import { Readable } from 'stream'
import QRCodeStyling, { Options } from 'qr-code-styling'
import { touchPointFormSchema } from '@/shared/schemas/touch-points'

/**
 * Resolve BOTH the acting user id and the Supabase client an upload should use, from ONE session
 * lookup (the two decisions hinge on the same fact — is there a browser session?).
 *
 * Browser requests carry a Casdoor session: the id is session.sub and the storage client is the
 * per-user browser client (`createClient`, whose custom fetch signs each request with the user's
 * Casdoor-derived Supabase JWT). Agent back-hop requests (RequestRole.AGENT) have NO browser
 * session and NO Casdoor cookie: the id comes from requestContext.userId (the minting user, set by
 * withAgentAuth — same fallback as getUserOrgPermissions), and the client must be the service-role
 * client (`createServiceClient`), because the browser client's getSupabaseJwt() would produce a
 * `Bearer null` that Supabase Storage rejects with "Invalid Compact JWS" (a 500). The route already
 * authorized the write (withAgentAuth(['write']) + ensurePolicy), so service-role here is the same
 * trust boundary the rest of the agent write path already uses (BaseRepository is service-role too).
 *
 * `userId` is undefined only when neither a session nor an agent context exists — no anonymous
 * uploads. The id is also the storage-path prefix, so an agent upload lands under the real user's
 * folder exactly as that user's browser upload would.
 */
async function resolveUploadContext() {
  const session = await getSession()
  if (session) return { userId: session.sub, supabase: createClient() }
  return { userId: requestContext.getStore()?.userId, supabase: await createServiceClient() }
}

const parseCSV = async (file: File): Promise<Array<any>> => {
  const fileBuffer = await file.arrayBuffer()

  const buffer = Buffer.from(fileBuffer)

  const stream = Readable.from(buffer)
  return new Promise((resolve, reject) => {
    Papa.parse(stream, {
      preview: 5,
      delimiter: ';',
      header: true,
      skipEmptyLines: true,
      encoding: 'utf-8',
      dynamicTyping: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => (value.length === 0 ? undefined : value),
      complete: (results) => {
        try {
          const rows = results.data as any[]
          resolve(rows)
        } catch (err) {
          reject(err)
        }
      },
      error: (err) => reject(err),
    })
  })
}

interface UploadFileProps {
  folder: string
  file: File
  logo_type?: string
}

interface RenderToFileAndUploadProps {
  folder: string
  fileName: string
  qrOptions: z.infer<typeof touchPointFormSchema.shape.qr_customize_options>
}

interface ValidateImageUploadProps {
  file: File
  logoType?: string
  fileType?: string
}

function sanitizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase()
}

// Image Upload Validator
export const validateImageUpload = async ({ file, logoType }: ValidateImageUploadProps) => {
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileType = await fileTypeFromBuffer(buffer)
  if (!fileType?.mime.startsWith('image/'))
    throw new AppError('Unsupported file type', {
      key: 'common:messages.error.unsupported_field_type',
      params: {
        field: '$t(label.file)',
      },
    })
  const meta = await sharp(buffer).metadata()
  const [width, height] =
    logoType === 'qr-logo' ? [256, 256] : [Math.round(meta.width!), Math.round(meta.height!)]
  const image = sharp(buffer)
    .resize(width, height, {
      fit: 'cover',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
  const resizedBuffer = await image.toBuffer()
  if (resizedBuffer.byteLength > 5 * 1024 * 1024) {
    throw new AppError('File size exceeds 5MB limit', {
      key: 'common:messages.error.field_exceed_limit',
      params: {
        field: '$t(label.file)',
        limit: '5',
      },
    })
  }
  /**
   * @property {string} fileType - The MIME type of the image file after processing (e.g. "image/png").
   */
  return { resized: resizedBuffer, fileType }
}

export const uploadFile = async ({ folder, file, logo_type }: UploadFileProps) => {
  const { userId, supabase } = await resolveUploadContext()
  if (!userId) throw new UnauthorizedError()

  const path = `${userId}/${folder}/${sanitizeFilename(file.name)}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const fileType = await fileTypeFromBuffer(buffer)
  if (!fileType)
    throw new AppError('Unsupported file type', {
      key: 'common:messages.error.unsupported_field_type',
      params: {
        field: '$t(label.file)',
      },
    })

  const uploadContent = fileType.mime.startsWith('image/')
    ? await validateImageUpload({ file, logoType: logo_type })
    : { resized: buffer, fileType }

  const { data, error } = await supabase.storage
    .from('proxi-public-user-upload')
    .upload(path, uploadContent.resized, {
      upsert: true,
      cacheControl: '0',
      contentType: uploadContent.fileType.mime,
    })

  if (error)
    throw new AppError(error.message, {
      key: 'common:messages.error.upload_failed',
      params: {
        field: '$t(label.image)',
      },
    })
  return { uploadRespone: data }
}

type SimpleUploadFileProps = {
  folder: string
  file: File
  allowedTypes?: string[]
  limit?: number
  options?: {
    skipValidateFileType?: boolean
    fallbackFileType?: string
  }
}
export const simpleUploadFile = async ({
  folder,
  file,
  allowedTypes = ['image/*'],
  limit = 5 * 1024 * 1024,
  options,
}: SimpleUploadFileProps) => {
  const { skipValidateFileType = false, fallbackFileType = 'image/png' } = options ?? {}
  let fileType = fallbackFileType

  const { userId, supabase } = await resolveUploadContext()
  if (!userId) throw new UnauthorizedError()

  if (!skipValidateFileType) {
    const { fileType: fileTypeFromValidate, success } = await validateFileType(file, allowedTypes)
    fileType = fileTypeFromValidate ?? fallbackFileType
    if (!success)
      throw new BadRequestError('Unsupported file type', {
        key: 'common:messages.error.unsupported_field_type',
        params: {
          field: '$t(label.file)',
        },
      })
  }

  const filename = `${userId}/${folder}/${sanitizeFilename(file.name)}`

  const isExceedFileLimit = file.size > limit
  if (isExceedFileLimit)
    throw new BadRequestError('File size exceeds limit', {
      key: 'common:messages.error.field_exceed_limit',
      params: {
        field: '$t(label.file)',
        limit: limit / 1024 / 1024,
      },
    })

  const { data: uploadRespone, error } = await supabase.storage
    .from('proxi-public-user-upload')
    .upload(filename, file, {
      upsert: true,
      cacheControl: '0',
      contentType: fileType,
    })
  if (error)
    throw new AppError(error.message, {
      key: 'common:messages.error.upload_failed',
      params: {
        field: '$t(label.image)',
      },
    })
  return uploadRespone
}

const validateFileType = async (
  file: File,
  allowedTypes: string[]
): Promise<{ fileType?: string; success: boolean }> => {
  if (allowedTypes.includes('text/csv')) {
    const result = await parseCSV(file)
      .then((data) => {
        return { fileType: 'text/csv', success: true }
      })
      .catch(() => {
        return { success: false }
      })
    return result
  }
  const fileType = await fileTypeFromBlob(file)
  if (allowedTypes.includes('image/svg+xml') && fileType?.mime === 'application/xml') {
    return { fileType: 'image/svg+xml', success: true }
  }

  if (!fileType || !allowedTypes.includes(fileType.mime))
    throw new BadRequestError('Unsupported file type', {
      key: 'common:messages.error.unsupported_field_type',
      params: {
        field: '$t(label.file)',
      },
    })
  return { fileType: fileType.mime, success: true }
}

export const renderToFileAndUpload = async ({
  folder,
  fileName,
  qrOptions,
}: RenderToFileAndUploadProps) => {
  const { userId, supabase } = await resolveUploadContext()
  if (!userId) throw new UnauthorizedError()

  const qrCode = new QRCodeStyling(qrOptions)

  const blobOrBuffer = await qrCode.getRawData('png')

  let buffer: Buffer
  if (blobOrBuffer instanceof Blob) {
    buffer = Buffer.from(await blobOrBuffer.arrayBuffer())
  } else if (blobOrBuffer instanceof ArrayBuffer) {
    buffer = Buffer.from(blobOrBuffer)
  } else if (Buffer.isBuffer(blobOrBuffer)) {
    buffer = blobOrBuffer
  } else {
    throw new AppError('Failed to generate QR code buffer', {
      key: 'common:messages.error.invalid_file',
    })
  }
  const path = `${userId}/${folder}/${sanitizeFilename(fileName)}.png`

  const fileType = await fileTypeFromBuffer(buffer)
  if (!fileType || !fileType.mime.startsWith('image/')) {
    throw new AppError('Unsupported file type', {
      key: 'common:messages.error.unsupported_field_type',
      params: { field: '$t(label.file)' },
    })
  }

  const { data, error } = await supabase.storage
    .from('proxi-public-user-upload')
    .upload(path, buffer, {
      upsert: true,
      cacheControl: '0',
      contentType: fileType.mime,
    })

  if (error) {
    throw new AppError(error.message, {
      key: 'common:messages.error.upload_failed',
      params: { field: '$t(label.image)' },
    })
  }
  return { uploadResponeForQrCode: data }
}

export async function uploadDashboardThumbnail(
  dashboardId: string,
  bytes: Uint8Array,
): Promise<string | null> {
  try {
    const session = await getSession()
    if (!session) return null

    const supabase = createClient()

    // Verify the caller has edit access: owner OR editor member
    const { data: owned } = await supabase
      .from('dashboards')
      .select('id')
      .eq('id', dashboardId)
      .eq('created_by', session.sub)
      .single()

    if (!owned) {
      const { data: membership } = await supabase
        .from('dashboard_members')
        .select('id')
        .eq('dashboard_id', dashboardId)
        .eq('user_id', session.sub)
        .eq('role', 'editor')
        .single()
      if (!membership) return null
    }

    const path = `${session.sub}/dashboard-thumbnails/${dashboardId}.webp`
    const buffer = Buffer.from(bytes)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('proxi-public-user-upload')
      .upload(path, buffer, {
        upsert: true,
        cacheControl: '0',
        contentType: 'image/webp',
      })

    if (uploadError || !uploadData) return null

    const { data: { publicUrl } } = supabase.storage
      .from('proxi-public-user-upload')
      .getPublicUrl(path)

    const { error: dbError } = await supabase
      .from('dashboards')
      .update({ thumbnail_url: publicUrl })
      .eq('id', dashboardId)

    if (dbError) return null
    return publicUrl
  } catch {
    return null
  }
}

// export const simpleUploadFileCSV = async ({
//   folder,
//   file,
//   allowedTypes = ['text/*'],
//   transform,
//   schema,
// }: SimpleUploadFileProps) => {
//   const session = await getSession()
//   if (!session) throw new UnauthorizedError()

//   if (!allowedTypes.includes(file.type))
//     throw new AppError('Unsupported file type', {
//       key: 'common:messages.error.unsupported_field_type',
//       params: {
//         field: '$t(label.file)',
//       },
//     })

//   const fileBuffer = await file.arrayBuffer()

//   const buffer = Buffer.from(fileBuffer)

//   const stream = Readable.from(buffer)
//   const data = await parseCSV(stream)

//   const headers = Object.keys(data[0])[0]
//     .split(',')
//     .map((h) => h.trim())

//   const parsedData = data.map((row: Record<string, string>) => {
//     const values = row[Object.keys(row)[0]].split(',').map((v) => v.trim())
//     return headers.reduce((acc, header, idx) => {
//       acc[header] = values[idx] ?? null
//       return acc
//     }, {} as Record<string, string | null>)
//   })

//   const { errors } = await mapAndValidate(transform, parsedData, schema ?? z.optional(z.object({})))

//   if (errors.length > 0) {
//     throw new AppError('Invalid file', {
//       key: 'common:messages.error.bad_request',
//     })
//   }

//   if (!data)
//     throw new AppError('Unsupported file type', {
//       key: 'common:messages.error.unsupported_field_type',
//       params: {
//         field: '$t(label.file)',
//       },
//     })

//   const supabase = await createClient()
//   const filename = `${session.sub}/${folder}/${sanitizeFilename(file.name)}`

//   const isExceedFileLimit = file.size > 5 * 1024 * 1024
//   if (isExceedFileLimit)
//     throw new AppError('File size exceeds 5MB limit', {
//       key: 'common:messages.error.field_exceed_limit',
//       params: {
//         field: '$t(label.file)',
//         limit: '5',
//       },
//     })

//   const { data: uploadRespone, error } = await supabase.storage
//     .from('proxi-public-user-upload')
//     .upload(filename, file, {
//       upsert: true,
//       cacheControl: '0',
//       contentType: 'text/csv',
//     })

//   if (error)
//     throw new AppError(error.message, {
//       key: 'common:messages.error.upload_failed',
//       params: {
//         field: '$t(label.image)',
//       },
//     })
//   return {
//     file_path: uploadRespone.path,
//   }
// }
