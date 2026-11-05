import { createIntegrationSchema } from '@/shared/schemas/integrations'
import { IntegrationType } from '@/features/integrations/constants'
import { z } from 'zod'

export abstract class BaseIntegrationService<T extends IntegrationType> {
  protected type: T
  protected config: Extract<z.infer<typeof createIntegrationSchema>, { type: T }>['config']
  protected integrationId?: string

  constructor(type: T, config: any, integrationId?: string) {
    this.type = type
    this.config = config
    this.integrationId = integrationId
  }

  abstract validateConfig(): Promise<boolean>
}
