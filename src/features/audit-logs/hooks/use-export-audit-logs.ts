import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { ExportAuditLogsParams } from '../types'
import { toast } from 'sonner'

export interface UseExportAuditLogsProps {
  orgId: string
}

export const useExportAuditLogs = ({ orgId }: UseExportAuditLogsProps) => {
  const { mutateAsync: exportLogs, isPending: isExporting } = useMutation({
    mutationFn: async (params: ExportAuditLogsParams) => {
      const response = await axiosApiInstance.get(
        `/organizations/${orgId}/audit-logs/export`,
        {
          params,
          responseType: 'blob', // Important for file download
        }
      )
      return { data: response.data, format: params.format }
    },
  })

  const exportData = useCallback(
    async (params: ExportAuditLogsParams) => {
      try {
        const { data, format } = await exportLogs(params)

        // Create blob and download
        const blob = new Blob([data], {
          type: format === 'csv' ? 'text/csv' : 'application/json',
        })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `audit-logs-${Date.now()}.${format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast.success(`Audit logs exported successfully as ${format.toUpperCase()}`)
      } catch (error) {
        toast.error('Failed to export audit logs')
        throw error
      }
    },
    [exportLogs]
  )

  return {
    exportData,
    isExporting,
  }
}
