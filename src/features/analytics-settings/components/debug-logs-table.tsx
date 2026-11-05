'use client'

import { useState } from 'react'
import { DebugLog } from '../hooks/queries'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { toast } from '@/shared/hooks/use-toast'

interface DebugLogsTableProps {
  logs: DebugLog[]
  isLoading: boolean
  currentPage: number
  hasMore: boolean
  onPageChange: (page: number) => void
  requestTypeFilter?: string
  onRequestTypeFilterChange?: (type: string) => void
  clientTypeFilter?: string
  onClientTypeFilterChange?: (type: string) => void
}

export const DebugLogsTable = ({
  logs,
  isLoading,
  currentPage,
  hasMore,
  onPageChange,
  requestTypeFilter,
  onRequestTypeFilterChange,
  clientTypeFilter,
  onClientTypeFilterChange,
}: DebugLogsTableProps) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800 border-green-200'
    if (status >= 400) return 'bg-red-100 text-red-800 border-red-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100 text-blue-800 border-blue-200',
      sale: 'bg-green-100 text-green-800 border-green-200',
      pageview: 'bg-purple-100 text-purple-800 border-purple-200',
      interaction: 'bg-orange-100 text-orange-800 border-orange-200',
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getClientTypeColor = (type: string) => {
    return type === 'publishable'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-green-100 text-green-800 border-green-200'
  }

  const getClientTypeLabel = (type: string) => {
    return type === 'publishable' ? '🌐 Client' : '🔧 Server'
  }

  const copyRequestId = async (requestId: string) => {
    try {
      await navigator.clipboard.writeText(requestId)
      setCopiedId(requestId)
      setTimeout(() => setCopiedId(null), 2000)
      toast({
        title: 'Copied',
        description: 'Request ID copied to clipboard',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy request ID',
        variant: 'destructive',
      })
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Inline Filters — only shown when filter handlers are provided */}
      {(onRequestTypeFilterChange || onClientTypeFilterChange) && (
        <div className="flex items-center gap-4 flex-wrap">
          {onRequestTypeFilterChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 shrink-0">Type:</span>
              <div className="flex gap-1">
                {[
                  { value: '', label: 'All' },
                  { value: 'lead', label: 'Lead' },
                  { value: 'sale', label: 'Sale' },
                  { value: 'pageview', label: 'Page' },
                  { value: 'interaction', label: 'Event' },
                ].map(({ value, label }) => (
                  <Badge
                    key={value}
                    variant={requestTypeFilter === value ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer text-[11px] px-1.5 py-0',
                      requestTypeFilter === value && value && getTypeColor(value)
                    )}
                    onClick={() => onRequestTypeFilterChange(value)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {onRequestTypeFilterChange && onClientTypeFilterChange && (
            <div className="w-px h-4 bg-slate-200" />
          )}

          {onClientTypeFilterChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 shrink-0">Client:</span>
              <div className="flex gap-1">
                {[
                  { value: '', label: 'All' },
                  { value: 'publishable', label: '🌐 Client' },
                  { value: 'api', label: '🔧 Server' },
                ].map(({ value, label }) => (
                  <Badge
                    key={value}
                    variant={clientTypeFilter === value ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer text-[11px] px-1.5 py-0',
                      clientTypeFilter === value && value && (value === 'publishable'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-green-100 text-green-800 border-green-200')
                    )}
                    onClick={() => onClientTypeFilterChange(value)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-slate-500">No debug logs found</p>
          <p className="text-xs text-slate-400 mt-0.5">
            SDK tracking requests will appear here when debug mode is enabled
          </p>
        </div>
      ) : <>
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32px] px-2"></TableHead>
              <TableHead className="text-xs px-2">Time</TableHead>
              <TableHead className="text-xs px-2">Type</TableHead>
              <TableHead className="text-xs px-2">Client</TableHead>
              <TableHead className="text-xs px-2">Request ID</TableHead>
              <TableHead className="text-xs px-2">Status</TableHead>
              <TableHead className="text-xs px-2 text-right">SDK Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <>
                <TableRow
                  key={log.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => toggleExpand(log.id)}
                >
                  <TableCell className="px-2 py-1.5">
                    {expandedRow === log.id ? (
                      <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 px-2 py-1.5">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0', getTypeColor(log.request_type))}>
                      {log.request_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0', getClientTypeColor(log.client_type))}>
                      {getClientTypeLabel(log.client_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <span className="truncate max-w-[160px]">{log.request_id}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyRequestId(log.request_id)
                        }}
                      >
                        {copiedId === log.request_id ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0', getStatusColor(log.response_status))}>
                        {log.response_status}
                      </Badge>
                      {log.error_code && log.response_status >= 400 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-[10px] px-1 py-0 font-mono">
                          {log.error_code}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-600 px-2 py-1.5">
                    {log?.sdk_version || '-'}
                  </TableCell>
                </TableRow>

                {/* Expanded Row */}
                {expandedRow === log.id && (
                  <TableRow>
                    <TableCell colSpan={7} className="bg-slate-50 px-3 py-3">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Request Payload */}
                        <div>
                          <h4 className="text-xs font-medium text-slate-700 mb-1">Request Payload</h4>
                          <pre className="bg-white p-2 rounded border text-[11px] overflow-auto max-h-48 leading-tight">
                            {JSON.stringify(log.request_payload, null, 2)}
                          </pre>
                        </div>

                        {/* Response Body */}
                        <div>
                          <h4 className="text-xs font-medium text-slate-700 mb-1">Response Body</h4>
                          <pre className="bg-white p-2 rounded border text-[11px] overflow-auto max-h-48 leading-tight">
                            {log.response_body
                              ? JSON.stringify(log.response_body, null, 2)
                              : 'No content (204)'}
                          </pre>
                        </div>

                        {/* Metadata */}
                        <div className="col-span-2">
                          <h4 className="text-xs font-medium text-slate-700 mb-1">Metadata</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                            <span>
                              <span className="text-slate-400">Client:</span>{' '}
                              <span className="font-medium">{getClientTypeLabel(log.client_type)}</span>
                            </span>
                            <span>
                              <span className="text-slate-400">IP:</span>{' '}
                              <span className="font-mono">{log.ip}</span>
                            </span>
                            <span className="basis-full">
                              <span className="text-slate-400">UA:</span>{' '}
                              <span className="truncate">{log.user_agent}</span>
                            </span>
                            {log.referrer && (
                              <span className="basis-full">
                                <span className="text-slate-400">Referrer:</span>{' '}
                                <span className="truncate">{log.referrer}</span>
                              </span>
                            )}
                            {(log.error_message || log.error_code) && (
                              <span className="basis-full flex items-center gap-2">
                                <span className="text-red-600 font-medium">Error:</span>
                                {log.error_code && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-[10px] px-1 py-0 font-mono">
                                    {log.error_code}
                                  </Badge>
                                )}
                                {log.error_message && (
                                  <span className="text-red-600">{log.error_message}</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div></>}

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-xs text-slate-500">Page {currentPage}</span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasMore}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
