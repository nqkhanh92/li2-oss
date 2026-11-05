import { WorkerLogEvent } from '../hybrid-audit-logger/hybrid-audit-logger'
import { redis } from '@/infrastructure/cache/redis'
import dayjs from 'dayjs'

type LogEventType = 'REACT_ERROR_BOUNDARY_CAUGHT' | 'API_SERVER_ERROR'

export interface LogEvent {
  eventType: LogEventType
  userId?: string
  timestamp?: Date
  ipAddress?: string
  userAgent?: string
  reason?: string
  errorMessage?: string
  metadata?: Record<string, any>
}
type SystemLoggerConfig = {
  level: 'system'
  env: 'development' | 'production'
  streamName: 'proxify_dev_logs' | 'proxify_logs'
}

export class SystemLogger {
  private config: SystemLoggerConfig
  constructor(
    config: SystemLoggerConfig = {
      level: 'system',
      env: process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 'production' : 'development',
      streamName:
        process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 'proxify_logs' : 'proxify_dev_logs',
    }
  ) {
    this.config = config
  }
  async logEvent(module: string, event: LogEvent): Promise<void> {
    const workerLogEvent: WorkerLogEvent = {
      created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      level: this.config.level,
      service: module,
      env: this.config.env,
      message: event,
      stream_name: this.config.streamName,
    }
    await redis.lpush('open_observe:log', JSON.stringify(workerLogEvent))
  }
}
