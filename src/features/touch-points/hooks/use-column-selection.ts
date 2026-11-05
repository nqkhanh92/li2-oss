import { useState, useCallback } from 'react'

export interface UseColumnSelectionProps {
  initialColumns: string[]
}

export const useColumnSelection = ({ initialColumns }: UseColumnSelectionProps) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(initialColumns)

  const toggleColumn = useCallback((columnId: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(columnId)) {
        return prev.filter((id) => id !== columnId)
      } else {
        return [...prev, columnId]
      }
    })
  }, [])

  const selectAll = useCallback((columnIds: string[]) => {
    setSelectedColumns(columnIds)
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedColumns([])
  }, [])

  return {
    selectedColumns,
    toggleColumn,
    selectAll,
    deselectAll,
  }
}
