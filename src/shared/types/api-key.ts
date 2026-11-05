import { Tables, Database } from './database.types'
import { RolePermissionKey } from './role-permission'

export enum ApiKeyType {
  USER = 'user',
  BOT = 'bot',
}

export type ApiKey = Tables<'api_keys'> & {
  bot_user?: {
    id: string
    email: string
    display_name: string | null
  } | null
  created_by_user?: {
    id: string
    email: string
    display_name: string | null
  } | null
}

export type ApiKeyWithSecret = ApiKey & {
  secret_key: string // Only returned once during creation
}

export type CreateApiKeyRequest = {
  name: string
  key_type: ApiKeyType
  permissions: RolePermissionKey[]
  expires_at?: string | null
}

export type UpdateApiKeyRequest = {
  name?: string
  permissions?: RolePermissionKey[]
  is_active?: boolean
  expires_at?: string | null
}

export type ApiKeyListItem = ApiKey
