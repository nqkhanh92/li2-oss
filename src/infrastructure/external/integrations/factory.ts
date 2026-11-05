import { IntegrationType } from '@/features/integrations/constants'
import { BaseIntegrationService } from './base'
import { ParcelvoyIntegrationService } from './parcelvoy.service'
import { GoogleSheetsIntegrationService } from './google-sheets.service'
import { z } from 'zod'
import {
  createIntegrationSchema,
  googleSheetsConfigSchema,
  parcelvoyConfigSchema,
} from '@/shared/schemas/integrations'

export function createIntegrationService(
  type: IntegrationType,
  config: z.infer<typeof createIntegrationSchema>['config'],
  integrationId?: string
): BaseIntegrationService<IntegrationType> {
  switch (type) {
    case IntegrationType.PARCELVOY:
      return new ParcelvoyIntegrationService(
        config as z.infer<typeof parcelvoyConfigSchema>['config']
      )
    case IntegrationType.GOOGLE_SHEETS:
      return new GoogleSheetsIntegrationService(
        config as z.infer<typeof googleSheetsConfigSchema>['config'],
        integrationId
      )
    case IntegrationType.HUBSPOT:
    // return new HubspotIntegrationService(config);
    // ... handle other types
    default:
      throw new Error(`Unknown integration type: ${type}`)
  }
}
