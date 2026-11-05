import { Tables } from './database.types'

// =====================================================
// Database table types
// =====================================================
export type Collection = Tables<'collections'>
export type CollectionMember = Tables<'collection_members'>

// =====================================================
// Enums
// =====================================================
export enum CollectionOrgPermission {
  CAN_EDIT = 'can_edit',
  CAN_VIEW = 'can_view',
  NO_ACCESS = 'no_access',
}

export enum CollectionRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  NO_ACCESS = 'no_access',
}

// =====================================================
// DTOs (Data Transfer Objects)
// =====================================================
export interface CreateCollectionDTO {
  name: string
  description?: string
  color?: string
  organization_id: string
  user_id: string
  org_permission?: CollectionOrgPermission
}

export interface UpdateCollectionDTO {
  name?: string
  description?: string | null
  color?: string | null
  org_permission?: CollectionOrgPermission
}

export interface AddCollectionMemberDTO {
  collection_id: string
  user_id: string
  role: CollectionRole
  added_by: string
}

export interface AddCollectionMemberInput {
  user_id: string
  role: CollectionRole
}

export interface UpdateCollectionMemberDTO {
  role: CollectionRole
}

// =====================================================
// Response types with additional data
// =====================================================
export interface CollectionWithStats extends Collection {
  touch_points_count: number
  members_count: number
  creator?: { id: string; name: string; email: string }
}

export interface CollectionMemberWithProfile extends CollectionMember {
  profile: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
}

export interface CollectionWithMembers extends Collection {
  members: CollectionMemberWithProfile[]
}

export interface CollectionWithTouchPoints extends Collection {
  touch_points: {
    id: string
    name: string
    short_url: string
    short_code: string
  }[]
}

// =====================================================
// Query parameters
// =====================================================
export interface GetCollectionsQueryParams {
  page?: number
  limit?: number
  search?: string
  org_permission?: CollectionOrgPermission
  sort_by?: 'name' | 'created_at' | 'updated_at'
  sort_order?: 'asc' | 'desc'
}

// =====================================================
// Permission check result
// =====================================================
export interface CollectionPermissionResult {
  canView: boolean
  canEdit: boolean // Can edit collection metadata (name, description, org_permission)
  canEditContent: boolean // Can edit touch-points within the collection (for collaboration)
  canDelete: boolean
  canManageMembers: boolean
  effectiveRole: CollectionRole | null
  source: 'org_permission' | 'collection_member' | 'org_role'
}
