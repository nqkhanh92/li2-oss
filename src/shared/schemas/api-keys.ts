import { z } from 'zod'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { ApiKeyType } from '@/shared/types/api-key'

// API Key Type enum values
export const apiKeyTypeEnum = z.nativeEnum(ApiKeyType)

// Permission keys validation - must be valid permission keys
const permissionKeySchema = z.nativeEnum(ROLE_PERMISSION_KEYS)

// Create API Key Schema
export const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  key_type: apiKeyTypeEnum,
  permissions: z
    .array(permissionKeySchema)
    .min(1, 'At least one permission is required')
    .max(50, 'Too many permissions selected'),
  expires_at: z.string().datetime().optional().nullable(),
})

// Update API Key Schema
export const updateApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  permissions: z
    .array(permissionKeySchema)
    .min(1, 'At least one permission is required')
    .max(50, 'Too many permissions selected')
    .optional(),
  is_active: z.boolean().optional(),
  expires_at: z.string().datetime().optional().nullable(),
})

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>
