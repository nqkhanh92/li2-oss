import { useMemo, useCallback } from 'react'
import { DateRange } from 'react-day-picker'
import { useExportTouchPoints } from './mutations'
import { TouchPointDataTransformer, ColumnDefinition } from '../utils/data-transformer'
import { ExportStrategy } from '../utils/export-strategies'

export interface UseExportTouchPointsDataProps {
  orgId: string
  qrOnly?: boolean
  nfcOnly?: boolean
  columns: ColumnDefinition[]
  exportStrategy: ExportStrategy
  dateRange?: DateRange
  extraFilters?: Record<string, any>
  search?: string
}

export const useExportTouchPointsData = ({
  orgId,
  qrOnly,
  nfcOnly,
  columns,
  exportStrategy,
  dateRange,
  extraFilters,
  search,
}: UseExportTouchPointsDataProps) => {
  const transformer = new TouchPointDataTransformer(columns)

  const filters = useMemo(
    () => ({
      filters: {
        created_at: {
          from: dateRange?.from?.getTime(),
          to: dateRange?.to?.getTime(),
        },
        ...(qrOnly ? { variants_content: { QR: { enabled: true } } } : {}),
        ...(nfcOnly ? { variants_content: { NFC: { enabled: true } } } : {}),
        ...extraFilters,
      },
      search,
      pagination: {
        pageIndex: 0,
        pageSize: 1000,
      },
      sorting: [
        {
          id: 'created_at',
          desc: true,
        },
      ],
    }),
    [qrOnly, nfcOnly, dateRange, extraFilters, search]
  )

  const { mutateAsync: exportTouchPoints, isPending: isExporting } = useExportTouchPoints(
    orgId,
    filters
  )

  const exportData = useCallback(
    async (
      selectedColumns: string[],
      options?: { extra?: Record<string, any>; onSuccess?: () => void }
    ) => {
      if (exportStrategy.type === 'csv') {
        const { data, status } = await exportTouchPoints({
          fields: selectedColumns,
          type: exportStrategy.type,
          ...options?.extra,
        })
        const transformedData = transformer.transform(data.data, selectedColumns)
        exportStrategy.export(transformedData, 'touchpoints')
        if (data) {
          options?.onSuccess?.()
        }
      }
      if (exportStrategy.type === 'sheets') {
        const result = await exportTouchPoints({
          fields: selectedColumns,
          type: exportStrategy.type,
          ...options?.extra,
        })
        if (result) {
          options?.onSuccess?.()
        }
      }
    },
    [exportTouchPoints, transformer, exportStrategy]
  )

  return {
    exportData,
    isExporting,
  }
}
