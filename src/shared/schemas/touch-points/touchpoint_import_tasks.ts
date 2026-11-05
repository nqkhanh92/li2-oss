import { z } from 'zod'

export const baseSchema = z.object({
  transform: z.record(z.string(), z.any()).optional().default({}),
})

export const csvImportSchema = baseSchema.merge(
  z.object({
    file: z.instanceof(File),
  })
)

export const sheetsImportSchema = baseSchema.merge(
  z.object({
    integration_id: z.string(),
    spreadsheet_id: z.string(),
    sheet_id: z.string().or(z.number()),
  })
)

export const createTouchpointImportTasksSchema = z.discriminatedUnion('type', [
  csvImportSchema.extend({ type: z.literal('csv') }),
  sheetsImportSchema.extend({ type: z.literal('sheets') }),
])

export const touchPointExportSchema = z.object({
  file: z.instanceof(Blob),
  filename: z.string(),
})

export const mappingColumnsSchema = z.array(
  z.object({
    header: z.string().optional().nullable(),
    column: z.string().optional().nullable(),
    confidence_score: z.number().optional().nullable(),
  })
)
