import { TouchPointExportType } from '@/core/types/touch-point.type'
import {
  createTouchpointImportTasksSchema,
  csvImportSchema,
  sheetsImportSchema,
} from '@/shared/schemas/touch-points/touchpoint_import_tasks'
import { z } from 'zod'

type ImportStrategyType = 'csv' | 'sheets'

type BaseImportParams = {
  orgId: string
  mapping: Map<keyof TouchPointExportType, string>
}

type CsvImportParams = BaseImportParams & {
  file: File
}

type SheetsImportParams = BaseImportParams & {
  integrationId: string
  spreadsheetId: string
  sheetId: string
}

type ImportParams = CsvImportParams | SheetsImportParams

export interface ImportStrategy {
  prepare(params: ImportParams): z.infer<typeof createTouchpointImportTasksSchema>
  validate(params: ImportParams): boolean
}

export class CsvImportStrategy implements ImportStrategy {
  prepare(params: CsvImportParams): z.infer<typeof createTouchpointImportTasksSchema> {
    return createTouchpointImportTasksSchema.parse({
      type: 'csv',
      file: params.file,
      transform: Object.fromEntries(params.mapping),
    })
  }

  validate(params: CsvImportParams): boolean {
    if (!params.file) {
      return false
    }
    const parsed = csvImportSchema.safeParse({
      file: params.file,
      transform: Object.fromEntries(params.mapping),
    })
    if (parsed.success) {
      return true
    }

    console.log({ error: parsed.error })
    return false
  }
}

export class SheetsImportStrategy implements ImportStrategy {
  prepare(params: SheetsImportParams): z.infer<typeof createTouchpointImportTasksSchema> {
    return createTouchpointImportTasksSchema.parse({
      type: 'sheets',
      integration_id: params.integrationId,
      spreadsheet_id: params.spreadsheetId,
      sheet_id: params.sheetId,
      transform: Object.fromEntries(params.mapping),
    })
  }

  validate(params: SheetsImportParams): boolean {
    if (!params.integrationId || !params.spreadsheetId || params.sheetId === undefined) {
      return false
    }
    const parsed = sheetsImportSchema.safeParse({
      type: 'sheets',
      integration_id: params.integrationId,
      spreadsheet_id: params.spreadsheetId,
      sheet_id: params.sheetId,
      transform: Object.fromEntries(params.mapping),
    })

    if (parsed.success) {
      return true
    }

    console.log({ error: parsed.error })
    return false
  }
}

export class ImportStrategyFactory {
  static getStrategy(type: ImportStrategyType): ImportStrategy {
    switch (type) {
      case 'csv':
        return new CsvImportStrategy()
      case 'sheets':
        return new SheetsImportStrategy()
    }
  }
}
