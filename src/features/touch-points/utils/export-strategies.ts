import Papa from 'papaparse'
import dayjs from '@/shared/lib/dayjs'
export type ExportType = 'csv' | 'sheets'
export interface ExportStrategy {
  type: ExportType
  export(data: Record<string, string>[], filename: string): void
}

export class CsvExportStrategy implements ExportStrategy {
  type: ExportType = 'csv'
  export(data: Record<string, string>[], filename: string): void {
    const csv = Papa.unparse(data, {
      header: true,
      skipEmptyLines: true,
    })
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}_${dayjs().format('YYYY-MM-DD')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
}
export class SheetsExportStrategy implements ExportStrategy {
  type: ExportType = 'sheets'

  export(data: Record<string, string>[], filename: string): void {}
  beforeExport(data: Record<string, string>[]): Record<string, string>[] {
    return data
  }
}

export const createExportStrategy = (type: ExportType = 'csv'): ExportStrategy => {
  switch (type) {
    case 'csv':
      return new CsvExportStrategy()
    case 'sheets':
      return new SheetsExportStrategy()
    default:
      return new CsvExportStrategy()
  }
}
