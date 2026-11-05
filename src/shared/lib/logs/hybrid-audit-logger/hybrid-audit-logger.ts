import dayjs from 'dayjs'
import { redis } from '../../../../infrastructure/cache/redis'
import {
  AuditEvent,
  AuditLogger,
  AuditLoggerConfig,
  EventFilter,
} from '../audit-logger/audit-logger'
const isProd = process.env.NEXT_PUBLIC_APP_ENV === 'production'
export type HybridAuditLoggerConfig = AuditLoggerConfig & {
  level: 'audit'
  env: 'production' | 'development'
  streamName: 'proxify_logs' | 'proxify_dev_logs'
}

export interface WorkerLogEvent {
  created_at: string
  level: string
  service: string
  env: string
  message: Record<string, any>
  status?: string
  stream_name: string
}
interface WorkerLogOptions {
  shouldLogToDatabase?: boolean
  shouldLogToOpenObserve?: boolean
}

export class HybridAuditLogger extends AuditLogger<HybridAuditLoggerConfig> {
  constructor(
    config: HybridAuditLoggerConfig = {
      level: 'audit',
      env: isProd ? 'production' : 'development',
      streamName: isProd ? 'proxify_logs' : 'proxify_dev_logs',
      schema: 'logs',
      table: 'audit_logs',
    }
  ) {
    super(config)
  }

  async logEvent(module: string, event: AuditEvent, options: WorkerLogOptions = {}): Promise<void> {
    const { shouldLogToDatabase = true, shouldLogToOpenObserve = true } = options

    const workerLogEvent: WorkerLogEvent = {
      created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      level: this.config.level,
      service: module,
      env: this.config.env,
      message: event,
      stream_name: this.config.streamName,
    }
    if (shouldLogToOpenObserve && isProd) {
      await redis.lpush('open_observe:log', JSON.stringify(workerLogEvent))
    }
    if (shouldLogToDatabase && isProd) {
      await super.logEvent(module, event)
    }
  }

  async logBatch(
    module: string,
    events: AuditEvent[],
    options: WorkerLogOptions = {}
  ): Promise<void> {
    const { shouldLogToDatabase = true, shouldLogToOpenObserve = true } = options

    const workerLogEvents: WorkerLogEvent[] = events.map((event) => {
      return {
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        level: this.config.level,
        service: module,
        env: this.config.env,
        message: event,
        stream_name: this.config.streamName,
      }
    })
    if (shouldLogToOpenObserve && isProd) {
      await redis.lpush('open_observe:logs', JSON.stringify(workerLogEvents))
    }
    if (shouldLogToDatabase && isProd) {
      await super.logBatch(module, events)
    }
  }

  async queryEvents(filter: EventFilter): Promise<AuditEvent[]> {
    return []
  }
}
