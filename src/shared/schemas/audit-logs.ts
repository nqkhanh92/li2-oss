import { z } from 'zod'

// Query parameter schema for listing audit logs
export const getAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  module: z.union([z.string(), z.array(z.string())]).optional(),
  action: z.union([z.string(), z.array(z.string())]).optional(),
  user_id: z.string().uuid().optional(),
  target_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  search: z.string().optional(),
})

// Query parameter schema for exporting audit logs
export const exportAuditLogsQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  module: z.union([z.string(), z.array(z.string())]).optional(),
  action: z.union([z.string(), z.array(z.string())]).optional(),
  user_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
})

// Type exports for use in API routes
export type GetAuditLogsQuery = z.infer<typeof getAuditLogsQuerySchema>
export type ExportAuditLogsQuery = z.infer<typeof exportAuditLogsQuerySchema>
