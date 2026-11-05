import { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'

export type UTMTemplate = Tables<'utm_templates'>
export type UTMTemplateListItem = Omit<UTMTemplate, 'created_by'> & {
  created_by: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
}

export type CreateUTMTemplate = TablesInsert<'utm_templates'>
export type UpdateUTMTemplate = TablesUpdate<'utm_templates'>
