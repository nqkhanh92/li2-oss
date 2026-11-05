import { defaultFacebookEventName } from '@/features/touch-points/components/forms/tracking/fb-tracking-form'
import { z } from 'zod'
import { strictBoolean } from '..'

export const conversionTrackingSchema = z.object({
  enabled: strictBoolean.default(false),
})

export const facebookTrackingSchema = z.object({
  pixel_id: z.string().optional(),
  event_name: z.string().max(64).default(defaultFacebookEventName).optional(),
  custom_data: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
})
export const googleTrackingSchema = z.object({
  ga_id: z.string().optional(),
  ga_event_name: z.string().max(64).optional(),
  ga_event_params: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
})

export const tiktokTrackingSchema = z.object({
  pixel_id: z.string().optional(),
  event_name: z.string().max(64).optional(),
  custom_data: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
})

export const trackingSchema = z.object({
  facebook: facebookTrackingSchema.optional(),
  google: googleTrackingSchema.optional(),
  tiktok: tiktokTrackingSchema.optional(),
})
