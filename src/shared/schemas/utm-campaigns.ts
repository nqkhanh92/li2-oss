import { z } from 'zod'
import { utmSchema } from './touch-points'
import { notFoundUrlSchema } from './touch-points/advanced.schema'
import { v4 as uuid } from 'uuid'

const dateRefine = {
  validator: (data: {
    start_date?: string | null | undefined
    end_date?: string | null | undefined
  }) => {
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date)
    }
    return true
  },
  params: {
    message: 'End date must be after or equal to start date',
    path: ['end_date'],
  },
}

const channelsTransform = <T extends { custom_utm_enabled?: boolean | undefined }>(data: T): T => {
  if (data.custom_utm_enabled) {
    return { ...data, channels: undefined }
  }
  return data
}

const superRefineUtm: z.SuperRefinement<any> = (data, ctx) => {
  if (data.custom_utm_enabled) {
    if (data.touchpoints && data.touchpoints.length > 0) {
      const notValidIndexes: number[] = []
      data.touchpoints.map((tp: any, index: number) => {
        if (!tp.utm_tags?.utm_source) {
          notValidIndexes.push(index)
        }
      })
      if (notValidIndexes.length > 0) {
        for (const index of notValidIndexes) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'UTM source is required',
            path: ['touchpoints', index],
          })
        }
      }
    }
  }
}
const superRefineChannel: z.SuperRefinement<any> = (data, ctx) => {
  if (!data.custom_utm_enabled) {
    if (data.touchpoints && data.touchpoints.length > 0) {
      const notValidIndexes: number[] = []
      data.touchpoints.map((tp: any, index: number) => {
        if (!tp.channel_id) {
          notValidIndexes.push(index)
        }
      })
      if (notValidIndexes.length > 0) {
        for (const index of notValidIndexes) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Channel is required',
            path: ['touchpoints', index],
          })
        }
      }
    }
  }
}

export const utmCampaignTouchPointSchema = z
  .object({
    utm_tags: utmSchema.nullable().optional(),
    touchpoint_id: z.string().uuid().optional(),
    channel_id: z.string().uuid().optional(),
    destination: z.string().url().optional(),
    type: z.enum(['existing', 'new']).default('existing').optional(),
    key: z.string().uuid(),
  })
  .transform((data) => {
    if (data.touchpoint_id) {
      return { ...data, type: 'existing' }
    }
    if (data.destination) {
      return { ...data, type: 'new' }
    }
    return data
  })

const baseUtmCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  start_date: z
    .string()
    .datetime()
    .or(z.date().transform((date) => date.toISOString()))
    .nullable()
    .optional(),
  end_date: z
    .string()
    .datetime()
    .or(z.date().transform((date) => date.toISOString()))
    .nullable()
    .optional(),
  not_found_url: notFoundUrlSchema.optional(),

  custom_utm_enabled: z.boolean().default(false),

  channels: z.array(z.string().or(z.string().uuid())).optional(),
  touchpoints: z.array(utmCampaignTouchPointSchema).optional(),
})

export const createUtmCampaignSchema = baseUtmCampaignSchema
  .refine(dateRefine.validator, dateRefine.params)
  .superRefine(superRefineUtm)
  .superRefine(superRefineChannel)
  .transform(channelsTransform)

export const updateUtmCampaignSchema = baseUtmCampaignSchema
  .partial()
  .refine(dateRefine.validator, dateRefine.params)
  .superRefine(superRefineUtm)
  .superRefine(superRefineChannel)
  .transform(channelsTransform)

export const bulkCreateUtmCampaignTouchpointsSchema = z.object({
  touchpoints: z.array(utmCampaignTouchPointSchema),
})

export const channelSchema = z.object({
  name: z.string().min(1).max(64),
  color: z.string().min(1),
})
