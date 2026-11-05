import { create } from 'zustand'
import { IntegrationType } from '@/features/integrations/constants'
import { z } from 'zod'
import { baseIntegrationSchema } from '@/shared/schemas/integrations'
type IntegrationStepperStore = {
  integrationBaseAttributes: z.infer<typeof baseIntegrationSchema>
  integrationType: IntegrationType | null
  setIntegrationType: (type: IntegrationType | null) => void
  setIntegrationBaseAttributes: (attributes: z.infer<typeof baseIntegrationSchema>) => void
}

export const useIntegrationStepperStore = create<IntegrationStepperStore>((set) => ({
  integrationType: null,
  integrationBaseAttributes: {
    name: '',
    description: '',
  },
  setIntegrationType: (type: IntegrationType | null) => set({ integrationType: type }),
  setIntegrationBaseAttributes: (attributes) => set({ integrationBaseAttributes: attributes }),
}))
