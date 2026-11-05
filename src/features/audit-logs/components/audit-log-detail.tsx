'use client'
import { Badge } from '@/shared/components/ui/badge'
import { CustomAvatar } from '@/shared/components/ui/custom-avatar'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { AuditLog } from '../types'
import { ACTION_COLORS, getModuleLabel, getActionLabel } from '../constants'
import { useDayjs } from '@/shared/hooks/use-dayjs'
import { useTranslation } from 'react-i18next'

interface AuditLogDetailProps {
  log: AuditLog
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AuditLogDetail = ({ log, open, onOpenChange }: AuditLogDetailProps) => {
  const { t } = useTranslation(['common', 'audit'])
  const { dayjs } = useDayjs()

  const actionColor = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'

  // Determine if we should show Before/After columns based on action
  const isDeleteAction =
    log.action.toLowerCase().includes('delete') || log.action.toLowerCase().includes('remove')
  const isCreateAction =
    log.action.toLowerCase().includes('create') || log.action.toLowerCase().includes('add')

  const showBefore = !isCreateAction
  const showAfter = !isDeleteAction

  return (
    <CustomDialogV2
      open={open}
      onOpenChange={onOpenChange}
      title={t('audit:detail.title')}
      size="md"
    >
      <div className="flex flex-col gap-4 w-full min-w-0 ">
        {/* Module & Action */}
        <div className="flex flex-col gap-1 pb-2 border-b border-slate-300">
          <div className="flex items-center gap-6">
            <span className="text-s text-foreground">{t('audit:fields.module')}</span>
            <div className="flex-1 flex justify-end px-2 py-1">
              <span className="text-s font-medium text-foreground">
                {getModuleLabel(t, log.module)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-s text-foreground">{t('audit:fields.action')}</span>
            <Badge
              className={`${actionColor} rounded-full font-medium py-1 px-3 text-xs`}
              variant="outline"
            >
              {getActionLabel(t, log.action)}
            </Badge>
          </div>
        </div>

        {/* User */}
        <div className="flex flex-col pb-2 border-b border-slate-300">
          <div className="flex items-start gap-6">
            <span className="text-s text-foreground">{t('audit:fields.user')}</span>
            <div className="flex-1 flex flex-col items-end gap-1 px-2">
              <div className="flex flex-col items-end gap-1">
                <span className="text-s font-medium text-primary">{log.profiles?.name || ''}</span>
                <div className="flex items-center gap-1">
                  <CustomAvatar
                    src={log.profiles?.avatar}
                    name={log.profiles?.name}
                    email={log.profiles?.email}
                    size={16}
                  />
                  <span className="text-xs text-gray-50">
                    {log.profiles?.email || t('audit:detail.not_available')}
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-50 font-mono">{log.user_id}</span>
            </div>
          </div>
        </div>

        {/* Target */}
        {(log.target_name || log.target_id) && (
          <div className="flex flex-col pb-2 border-b border-slate-300">
            <div className="flex items-start gap-6">
              <span className="text-s text-foreground">{t('audit:fields.target')}</span>
              <div className="flex-1 flex flex-col items-end gap-1 px-2">
                <span className="text-s font-medium text-primary">
                  {log.target_name || t('audit:detail.not_available')}
                </span>
                {log.target_id && (
                  <span className="text-xs text-gray-50 font-mono">{log.target_id}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-s text-foreground">{t('audit:fields.metadata')}</span>
            <div className="bg-slate-50 border border-slate-100 rounded-md px-4 py-2">
              <pre className="text-xs text-gray-50 whitespace-pre-wrap">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Changes */}
        {log.changes && Object.keys(log.changes).length > 0 && (
          <div className="flex flex-col gap-1 ">
            <span className="text-s text-foreground">{t('audit:fields.changes')}</span>
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-slate-50 flex items-center gap-6 px-2 py-2 text-xs text-gray-50 font-medium border-b border-slate-300">
                <span className="w-[150px]">{t('audit:detail.field')}</span>
                {showBefore && <span className="flex-1">{t('audit:detail.before')}</span>}
                {showAfter && <span className="flex-1">{t('audit:detail.after')}</span>}
              </div>

              {/* Table Body */}
              <div className="flex flex-col px-2 overflow-y-scroll max-h-[200px]">
                {Object.entries(log.changes).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex items-center gap-6 px-2 py-1 text-xs">
                    <span className="w-[150px] text-s font-medium text-primary whitespace-pre-wrap">
                      {key}
                    </span>
                    {showBefore && (
                      <div className="flex-1 overflow-hidden">
                        {value.old !== null && value.old !== undefined ? (
                          <span className="text-xs text-gray-50 overflow-ellipsis overflow-hidden whitespace-nowrap block">
                            {typeof value.old === 'object'
                              ? JSON.stringify(value.old)
                              : String(value.old)}
                          </span>
                        ) : (
                          <div className="bg-slate-50 h-4" />
                        )}
                      </div>
                    )}
                    {showAfter && (
                      <div className="flex-1 overflow-hidden">
                        {value.new !== null && value.new !== undefined ? (
                          <span className="text-xs text-gray-50 overflow-ellipsis overflow-hidden whitespace-nowrap block">
                            {typeof value.new === 'object'
                              ? JSON.stringify(value.new)
                              : String(value.new)}
                          </span>
                        ) : (
                          <div className="bg-slate-50 h-4" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex flex-col pb-2 border-b border-slate-300">
          <div className="flex items-start gap-6">
            <span className="text-s text-foreground">{t('audit:fields.timestamp')}</span>
            <div className="flex-1 flex flex-col items-end gap-1 px-2">
              <span className="text-s font-medium text-primary">
                {dayjs(log.created_at).format('dddd, MMMM D, YYYY h:mm A')}
              </span>
              <span className="text-xs text-gray-50">{dayjs(log.created_at).fromNow()}</span>
            </div>
          </div>
        </div>
      </div>
    </CustomDialogV2>
  )
}
