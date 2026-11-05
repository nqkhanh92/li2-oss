import { z } from 'zod'
import { CollectionOrgPermission, CollectionRole } from '../types/collection.types'

// Constants
export const MAX_COLLECTION_NAME_LENGTH = 100
export const MAX_COLLECTION_DESC_LENGTH = 500

// Enums as Zod schemas
export const collectionOrgPermissionSchema = z.enum([
  CollectionOrgPermission.CAN_EDIT,
  CollectionOrgPermission.CAN_VIEW,
  CollectionOrgPermission.NO_ACCESS,
])

export const collectionRoleSchema = z.enum([
  CollectionRole.OWNER,
  CollectionRole.EDITOR,
  CollectionRole.VIEWER,
  CollectionRole.NO_ACCESS,
])

// Collection schemas
export const createCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Collection name is required')
    .max(MAX_COLLECTION_NAME_LENGTH, `Collection name must be at most ${MAX_COLLECTION_NAME_LENGTH} characters`),
  description: z
    .string()
    .max(MAX_COLLECTION_DESC_LENGTH, `Description must be at most ${MAX_COLLECTION_DESC_LENGTH} characters`)
    .optional(),
  color: z
    .string()
    .regex(/^#([0-9A-F]{3}){1,2}$/i, 'Invalid color format')
    .optional(),
  org_permission: collectionOrgPermissionSchema.default(CollectionOrgPermission.CAN_EDIT),
})

export const updateCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Collection name is required')
    .max(MAX_COLLECTION_NAME_LENGTH, `Collection name must be at most ${MAX_COLLECTION_NAME_LENGTH} characters`)
    .optional(),
  description: z
    .string()
    .max(MAX_COLLECTION_DESC_LENGTH, `Description must be at most ${MAX_COLLECTION_DESC_LENGTH} characters`)
    .nullable()
    .optional(),
  color: z
    .string()
    .regex(/^#([0-9A-F]{3}){1,2}$/i, 'Invalid color format')
    .nullable()
    .optional(),
  org_permission: collectionOrgPermissionSchema.optional(),
})

// Collection member schemas
export const addCollectionMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  role: collectionRoleSchema,
})

export const updateCollectionMemberSchema = z.object({
  role: collectionRoleSchema,
})

export const bulkAddCollectionMembersSchema = z.object({
  members: z
    .array(
      z.object({
        user_id: z.string().uuid('Invalid user ID'),
        role: collectionRoleSchema,
      })
    )
    .min(1, 'At least one member is required'),
})

// Touch-point assignment schemas
export const addTouchPointToCollectionSchema = z.object({
  touch_point_id: z.string().uuid('Invalid touch-point ID'),
})

export const bulkAddTouchPointsToCollectionSchema = z.object({
  touch_point_ids: z
    .array(z.string().uuid('Invalid touch-point ID'))
    .min(1, 'At least one touch-point is required')
    .max(100, 'Cannot add more than 100 touch-points at once'),
})

export const removeTouchPointFromCollectionSchema = z.object({
  touch_point_id: z.string().uuid('Invalid touch-point ID'),
})

// Query parameter schemas
export const getCollectionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  org_permission: collectionOrgPermissionSchema.optional(),
  sort_by: z.enum(['name', 'created_at', 'updated_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

// Type exports for use in API routes
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>
export type AddCollectionMemberInput = z.infer<typeof addCollectionMemberSchema>
export type UpdateCollectionMemberInput = z.infer<typeof updateCollectionMemberSchema>
export type BulkAddCollectionMembersInput = z.infer<typeof bulkAddCollectionMembersSchema>
export type AddTouchPointToCollectionInput = z.infer<typeof addTouchPointToCollectionSchema>
export type BulkAddTouchPointsToCollectionInput = z.infer<typeof bulkAddTouchPointsToCollectionSchema>
export type GetCollectionsQuery = z.infer<typeof getCollectionsQuerySchema>
