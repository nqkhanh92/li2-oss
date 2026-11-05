import { useCallback } from 'react'
import { toast } from 'sonner'
import { createTouchpointImportTasksSchema } from '@/shared/schemas/touch-points/touchpoint_import_tasks'
import { TouchPointExportType } from '@/core/types/touch-point.type'
import { useImportTouchPointTask } from './mutations'
import { ImportStrategyFactory } from '../utils/import-strategies'

type UseTouchPointImportSubmitProps = {
  orgId: string
  onSuccess?: () => void
  type: 'csv' | 'sheets'
}

export const useTouchPointImportSubmit = ({
  orgId,
  onSuccess,
  type,
}: UseTouchPointImportSubmitProps) => {
  const { mutate: importTp, isPending } = useImportTouchPointTask(orgId)
  const strategy = ImportStrategyFactory.getStrategy(type)
  type ImportParams = Parameters<typeof strategy.prepare>[0]

  const handleSubmit = useCallback(
    (params: ImportParams) => {
      const isValid = strategy.validate(params)
      if (!isValid) {
        toast.error('Invalid data')
        return
      }

      const preparedData = strategy.prepare(params)
      importTp(preparedData, {
        onSuccess,
      })
    },
    [importTp, onSuccess]
  )

  return {
    handleSubmit,
    isPending,
  }
}
