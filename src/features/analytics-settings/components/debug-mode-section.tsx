'use client'

import { useToggleDebugMode, useClearDebugLogs } from '../hooks/mutations'
import { useGetDebugLogs } from '../hooks/queries'
import { useState } from 'react'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import { DebugLogsTable } from './debug-logs-table'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from '@/shared/hooks/use-toast'

interface DebugModeSectionProps {
  org_id: string
  debug_mode_enabled: boolean
  defaultClientTypeFilter?: string
}

export const DebugModeSection = ({ org_id, debug_mode_enabled, defaultClientTypeFilter = '' }: DebugModeSectionProps) => {
  const [page, setPage] = useState(1)
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('')
  const [clientTypeFilter, setClientTypeFilter] = useState<string>(defaultClientTypeFilter)

  const toggleDebugMode = useToggleDebugMode(org_id)
  const clearLogs = useClearDebugLogs(org_id)

  const { data: logsData, isLoading: logsLoading } = useGetDebugLogs(
    org_id,
    { page, limit: 50, request_type: requestTypeFilter, client_type: clientTypeFilter },
    debug_mode_enabled
  )

  const handleToggleDebugMode = async (enabled: boolean) => {
    try {
      await toggleDebugMode.mutateAsync({ enabled })
      toast({
        title: enabled ? 'Debug mode enabled' : 'Debug mode disabled',
        description: enabled
          ? 'All SDK tracking requests will now be logged.'
          : 'SDK tracking requests will no longer be logged.',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle debug mode. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all debug logs? This action cannot be undone.')) {
      return
    }

    try {
      await clearLogs.mutateAsync()
      setPage(1)
      toast({
        title: 'Debug logs cleared',
        description: 'All debug logs have been removed.',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear debug logs. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Debug Mode Toggle + Warning + Actions — all in one compact row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={debug_mode_enabled}
            onCheckedChange={handleToggleDebugMode}
            disabled={toggleDebugMode.isPending}
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900">Debug Mode</span>
            <span className="text-xs text-slate-500">
              Log SDK requests for debugging
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {debug_mode_enabled && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              May contain sensitive data
            </span>
          )}

          {debug_mode_enabled && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 tabular-nums">
                {logsData?.total || 0} log{logsData?.total !== 1 ? 's' : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                disabled={clearLogs.isPending || !logsData?.total}
                className="gap-1.5 h-7 text-xs px-2"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Debug Logs Table */}
      {debug_mode_enabled && (
        <DebugLogsTable
          logs={logsData?.data || []}
          isLoading={logsLoading}
          currentPage={page}
          hasMore={logsData?.has_more || false}
          onPageChange={setPage}
          requestTypeFilter={requestTypeFilter}
          onRequestTypeFilterChange={setRequestTypeFilter}
          clientTypeFilter={clientTypeFilter}
          onClientTypeFilterChange={setClientTypeFilter}
        />
      )}
    </div>
  )
}
