import { z } from 'zod'

export const staticQrFormSchema = z
  .object({
    name: z
      .string()
      .optional()
      .transform((value) => {
        if (!value || value.trim().length === 0) {
          const now = new Date()
          const generatedName =
            value ||
            `Static QR ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
              now.getDate()
            ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
              now.getMinutes()
            ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
          return generatedName
        }
        return value.trim()
      }),
    type: z.enum(['text', 'url', 'wifi']),
    text: z.string().max(256).optional(),
    url: z.string().max(256).optional(),
    wifi_ssid: z.string().max(256).optional(),
    wifi_password: z.string().max(256).optional(),
    wifi_security: z.enum(['WPA', 'WEP', 'nopass']).optional(),
    wifi_hidden: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === 'text') {
      if (!val.text || val.text.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['text'], message: 'Required' })
      }
    }
    if (val.type === 'url') {
      if (!val.url || val.url.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'Required' })
      }
    }
    if (val.type === 'wifi') {
      if (!val.wifi_ssid || val.wifi_ssid.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['wifi_ssid'], message: 'Required' })
      }
    }
  })

const payloadSchema = z
  .object({
    type: z.enum(['text', 'url', 'wifi']),
  })
  .passthrough()

export const createStaticQrSchema = z.object({
  name: z.string().min(1).max(256),
  payload: payloadSchema,
  qr_customize_options: z.record(z.any()).optional(),
})

export const updateStaticQrSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  payload: payloadSchema.optional(),
  qr_customize_options: z.record(z.any()).optional(),
})
