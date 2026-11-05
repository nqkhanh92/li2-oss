import { useCallback, useEffect, useState } from 'react'
import { TouchPointExportType } from '@/core/types/touch-point.type'
import { useAutoMappingImport } from './mutations'
import { TFunction } from 'i18next'
import { ExportColumn } from '../constants/import'

type UseTouchPointColumnMappingProps = {
  csvHeaders: string[]
  columns: ExportColumn[]
  orgId: string
  t: TFunction
}

export const useTouchPointColumnMapping = ({
  csvHeaders,
  columns,
  orgId,
  t,
}: UseTouchPointColumnMappingProps) => {
  const [mapping, setMapping] = useState<Map<keyof TouchPointExportType, string>>(new Map())
  const [autoMappingColumns, setAutoMappingColumns] = useState<string[]>([])
  const { mutateAsync: autoMappingImport } = useAutoMappingImport(orgId)

  const handleMappingChange = useCallback(
    (li2Field: keyof TouchPointExportType, csvField: string) => {
      setMapping((prev) => {
        if (
          (csvField === '' || csvField === null || csvField === undefined) &&
          prev.has(li2Field)
        ) {
          return new Map(prev.entries().filter(([key]) => key !== li2Field))
        }
        return new Map(prev.set(li2Field, csvField))
      })
    },
    []
  )

  const validateMapping = useCallback(() => {
    const invalidColumn = columns.find((col) => col.importRequired && !mapping.has(col.id))
    if (invalidColumn) {
      return {
        error: t('common:messages.error.field_required', { field: t(invalidColumn.i18nKey) }),
        column: invalidColumn.id,
      }
    }
    return {
      error: null,
      column: null,
    }
  }, [columns, mapping])

  const handleAIMapping = useCallback(
    async (headers: string[], columns: string[]) => {
      const newMapping = new Map<keyof TouchPointExportType, string>()
      const autoMapping = await autoMappingImport({
        notMappedHeaders: headers,
        notMappedColumns: columns,
      })
      for (const item of autoMapping) {
        if (item.column && item.header && item.confidence_score && item.confidence_score > 0.5) {
          newMapping.set(item.column as keyof TouchPointExportType, item.header)
        }
      }
      setMapping((prev) => new Map([...prev.entries(), ...newMapping]))
    },
    [autoMappingImport]
  )

  // Apply auto-mapping when CSV headers and columns are available
  useEffect(() => {
    const performAutoMapping = async () => {
      try {
        if (!csvHeaders || csvHeaders.length === 0 || !columns || columns.length === 0) {
          return
        }
        if (mapping.size > 0) {
          return
        }

        setAutoMappingColumns(columns.map((col) => col.id))

        const newMapping = new Map<keyof TouchPointExportType, string>()
        let notMappedHeaders = [...csvHeaders]
        let notMappedColumns: string[] = []

        // First pass: exact label matching (EN/VI)
        columns.forEach((col) => {
          const enLabel = t(col.i18nKey, { lng: 'en' })
          const viLabel = t(col.i18nKey, { lng: 'vi' })
          const normalizedEnLabel = enLabel.toLowerCase().trim()
          const normalizedViLabel = viLabel.toLowerCase().trim()

          const matchingHeader = csvHeaders.find((header: string) => {
            const normalizedHeader = header.toLowerCase().trim()
            return normalizedHeader === normalizedEnLabel || normalizedHeader === normalizedViLabel
          })

          if (matchingHeader) {
            newMapping.set(col.id, matchingHeader)
            notMappedHeaders = notMappedHeaders.filter(
              (header: string) => header !== matchingHeader
            )
            setAutoMappingColumns((prev) => prev.filter((id) => id !== col.id))
          } else {
            notMappedColumns.push(col.id)
          }
        })

        if (newMapping.size > 0) {
          setMapping(newMapping)
        }

        // Second pass: AI-based mapping for unmapped columns
        if (notMappedColumns.length > 0 && notMappedHeaders.length > 0) {
          await handleAIMapping(notMappedHeaders, notMappedColumns)
        }
        setAutoMappingColumns([])
      } catch (error) {
        console.log({ error })
        setAutoMappingColumns([])
      }
    }

    performAutoMapping()
  }, [csvHeaders, columns])

  const reset = () => {
    setMapping(new Map())
    setAutoMappingColumns([])
  }

  return {
    mapping,
    autoMappingColumns,
    handleMappingChange,
    validateMapping,
    reset,
  }
}
