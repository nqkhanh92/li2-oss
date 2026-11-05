import { HubspotIcon } from '@/shared/components/icons/hubspot-icon'
import { MauticIcon } from '@/shared/components/icons/mautic-icon'
import { ParcelvoyIcon } from '@/shared/components/icons/parcelvoy-icon'
import { SheetsIcon } from '@/shared/components/icons/sheets-icon'
import { LucideAArrowDown } from 'lucide-react'

export enum IntegrationType {
  PARCELVOY = 'PARCELVOY',
  MAUTIC = 'MAUTIC',
  HUBSPOT = 'HUBSPOT',
  GOOGLE_SHEETS = 'GOOGLE_SHEETS',
}
export const mappingIntegrationType = {
  [IntegrationType.GOOGLE_SHEETS]: {
    label: 'Google Sheets',
    trans_key: 'integration_list.google_sheets.label',
    icon: SheetsIcon,
    enabled: true,
    description: 'integration_list.google_sheets.description',
    docs_url: '#',
    website_url: 'https://sheets.google.com',
  },
  [IntegrationType.PARCELVOY]: {
    label: 'Parcelvoy',
    trans_key: 'integration_list.parcelvoy.label',
    icon: ParcelvoyIcon,
    enabled: false,
    description: 'integration_list.parcelvoy.description',
    docs_url: '#',
    website_url: process.env.NEXT_PUBLIC_PARCELVOY_URL ?? 'https://parcelvoy.com',
  },
  [IntegrationType.MAUTIC]: {
    label: 'Mautic',
    trans_key: 'integration_list.mautic.label',
    icon: MauticIcon,
    enabled: false,
    description: 'integration_list.mautic.description',
    docs_url: 'https://example.com/integrations/mautic',
    website_url: 'https://mautic.org',
  },
  [IntegrationType.HUBSPOT]: {
    label: 'Hubspot',
    trans_key: 'integration_list.hubspot.label',
    icon: HubspotIcon,
    enabled: false,
    description: 'integration_list.hubspot.description',
    docs_url: 'https://example.com/integrations/hubspot',
    website_url: 'https://hubspot.com',
  },
}

export const integrationTypes = Object.values(IntegrationType)

export const googleScopes = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
]
