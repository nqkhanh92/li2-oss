import { TouchPointDetail } from '@/core/types/touch-point.type'

export interface ColumnDefinition {
  id: string
  label: string
  checked: boolean
  transform?: (row: TouchPointDetail) => string | null
}

export class TouchPointDataTransformer {
  constructor(private columns: ColumnDefinition[]) {}

  transform(data: TouchPointDetail[], selectedColumns: string[]): Record<string, string>[] {
    return data.map((row) => {
      const transformedItem: Record<string, string> = {}

      selectedColumns.forEach((columnId) => {
        const currentColumn = this.columns.find((col) => col.id === columnId)
        if (!currentColumn) return

        const cell = row[currentColumn.id as keyof TouchPointDetail]
        const label = currentColumn.label
        transformedItem[label] = currentColumn.transform?.(row) || cell?.toString() || ''
      })

      return transformedItem
    })
  }

  getHeaders(fields: string[]): string[] {
    return this.columns.filter((col) => fields.includes(col.id)).map((col) => col.label)
  }

  getRows(data: TouchPointDetail[], fields: string[]): string[][] {
    const filteredColumns = this.columns.filter((col) => fields.includes(col.id))

    const arrs = Array.from(data, (row) => {
      return filteredColumns.map((column) => {
        return column.transform?.(row) || row[column.id as keyof TouchPointDetail]?.toString() || ''
      })
    })

    return arrs
  }
}
