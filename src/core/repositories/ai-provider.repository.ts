import { supabaseService } from '@/infrastructure/database/supabase'
import { BaseRepository } from './base.repository'
import { AppError } from '@/infrastructure/response/errors/domain.errors'
import { AIProviderStatus } from '../types/ai-provider.type'
import { logger } from '@/infrastructure/logging/logger'
const log = logger.child({
  module: 'ai-provider-repository',
})
export class AIProviderRepository extends BaseRepository<'ai_provider_keys'> {
  constructor() {
    super('ai_provider_keys')
  }
  async updateStatusByApiKey(apiKey: string, status: AIProviderStatus) {
    const { data: updatedData, error } = await this.query()
      .update({ status })
      .eq('api_key', apiKey)
      .single()
    if (error) {
      log.error({ error, method: 'updateStatusByApiKey' })
      throw new AppError(error.message)
    }
    log.info({ updatedData, method: 'updateStatusByApiKey' })
    return updatedData
  }
}
export const aiProviderRepo =
  process.env.NODE_ENV !== 'production'
    ? new AIProviderRepository()
    : globalThis._aiProviderRepo ?? (globalThis._aiProviderRepo = new AIProviderRepository())
