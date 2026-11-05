import { z } from 'zod'

export const createEventRuleSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Event name is required')
      .max(256)
      .regex(/^[a-z0-9_]+$/, {
        message: 'Event name must be lowercase alphanumeric with underscores only',
      }),
    description: z.string().max(1000).optional(),
    trigger_type: z.enum(['click', 'form_submit', 'form_fill', 'element_visibility']).default('click'),
    // Click-specific criteria
    selector_path: z.string().optional(),
    element_text: z.string().max(256).optional(),
    element_id: z.string().max(256).optional(),
    element_href: z.string().max(2048).optional(),
    text_match_mode: z.enum(['equals', 'contains']).default('contains'),
    // Form-specific criteria
    form_id: z.string().max(256).optional(),
    form_name: z.string().max(256).optional(),
    form_action: z.string().max(2048).optional(),
    // Shared
    page_path: z.string().max(2048).optional(),
  })
  .refine(
    (data) => {
      if (data.trigger_type === 'click') {
        return data.selector_path || data.element_text || data.element_id || data.element_href || data.page_path
      }
      if (data.trigger_type === 'element_visibility') {
        return !!data.selector_path
      }
      // form_submit / form_fill
      return data.form_id || data.form_name || data.form_action || data.page_path
    },
    {
      message: 'At least one matching criterion is required',
      path: ['selector_path'],
    }
  )

export const updateEventRuleSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Event name is required')
      .max(256)
      .regex(/^[a-z0-9_]+$/, {
        message: 'Event name must be lowercase alphanumeric with underscores only',
      })
      .optional(),
    description: z.string().max(1000).optional().nullable(),
    trigger_type: z.enum(['click', 'form_submit', 'form_fill', 'element_visibility']).optional(),
    // Click-specific
    selector_path: z.string().optional().nullable(),
    element_text: z.string().max(256).optional().nullable(),
    element_id: z.string().max(256).optional().nullable(),
    element_href: z.string().max(2048).optional().nullable(),
    text_match_mode: z.enum(['equals', 'contains']).optional(),
    // Form-specific
    form_id: z.string().max(256).optional().nullable(),
    form_name: z.string().max(256).optional().nullable(),
    form_action: z.string().max(2048).optional().nullable(),
    // Shared
    page_path: z.string().max(2048).optional().nullable(),
    is_active: z.boolean().optional(),
  })

export type CreateEventRuleInput = z.infer<typeof createEventRuleSchema>
export type UpdateEventRuleInput = z.infer<typeof updateEventRuleSchema>
