import { IntegrationType } from '@/features/integrations/constants'
import { createIntegrationSchema } from '@/shared/schemas/integrations'
import { Tables } from '@/shared/types/database.types'
import { z } from 'zod'

type GoogleSpreadSheet = {
  id: string
  name: string
}

type GoogleSheet = {
  id: string
  name: string
}

type Integration = Omit<Tables<'integrations'>, 'config' | 'type'> & {
  type: IntegrationType
  config: Extract<z.infer<typeof createIntegrationSchema>, { type: IntegrationType }>['config']
}

export type { GoogleSpreadSheet, GoogleSheet, Integration }
