import { debugLogsRepo, DebugLogsRepository } from '../repositories/debug-logs.repository'

export interface DebugLogsParams {
  page: number
  limit: number
  request_type?: string
  client_type?: string
  start_date?: string
  end_date?: string
}

export class DebugLogsService {
  constructor(private repo: DebugLogsRepository) {}

  public async getDebugLogs(orgId: string, params: DebugLogsParams) {
    return this.repo.getDebugLogs(orgId, params)
  }

  public async clearDebugLogs(orgId: string): Promise<number> {
    return this.repo.clearDebugLogs(orgId)
  }
}

export const debugLogsService = globalThis._debugLogsService ?? new DebugLogsService(debugLogsRepo)

if (process.env.NODE_ENV !== 'production') globalThis._debugLogsService = debugLogsService
