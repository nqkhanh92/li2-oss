import { BaseRepository } from './base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
import { TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { CollectionMemberWithProfile, CollectionRole } from '@/shared/types/collection.types'

export class CollectionMemberRepository extends BaseRepository<'collection_members'> {
  constructor() {
    super('collection_members')
  }

  /**
   * Find all members of a collection
   */
  async findAllByCollection(collectionId: string) {
    const { data, error } = await this.query()
      .select(
        `
        *,
        profile:profiles!collection_members_user_id_fkey (
          id,
          name,
          email,
          avatar
        )
      `
      )
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []) as unknown as CollectionMemberWithProfile[]
  }

  /**
   * Find member role in a collection
   */
  async findMemberRole(collectionId: string, userId: string): Promise<CollectionRole | null> {
    const { data, error } = await this.query()
      .select('role')
      .eq('collection_id', collectionId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      throw error
    }

    return data.role as CollectionRole
  }

  /**
   * Check if user is a member of a collection
   */
  async isMember(collectionId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.query()
      .select('id')
      .eq('collection_id', collectionId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return !!data
  }

  /**
   * Add a member to a collection
   */
  async addMember(data: TablesInsert<'collection_members'>) {
    const { data: member, error } = await this.query().insert(data).select('*').single()

    if (error) throw error

    return member
  }

  /**
   * Update member role
   */
  async updateMemberRole(collectionId: string, userId: string, role: CollectionRole) {
    const { data, error } = await this.query()
      .update({ role, updated_at: new Date().toISOString() })
      .eq('collection_id', collectionId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error

    return data
  }

  /**
   * Remove a member from a collection
   */
  async removeMember(collectionId: string, userId: string) {
    const { error } = await this.query()
      .delete()
      .eq('collection_id', collectionId)
      .eq('user_id', userId)

    if (error) throw error

    return true
  }

  /**
   * Remove all members from a collection (used when deleting collection)
   */
  async removeAllMembers(collectionId: string) {
    const { error } = await this.query().delete().eq('collection_id', collectionId)

    if (error) throw error

    return true
  }

  /**
   * Count members in a collection
   */
  async countByCollection(collectionId: string): Promise<number> {
    const { count, error } = await this.query()
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collectionId)

    if (error) throw error

    return count || 0
  }

  /**
   * Get all collections where user is a member
   */
  async findCollectionsByUserId(userId: string, orgId?: string) {
    let query = this.query()
      .select(
        `
        *,
        collection:collections (
          *
        )
      `
      )
      .eq('user_id', userId)

    // Optionally filter by organization
    if (orgId) {
      query = query.eq('collections.organization_id', orgId)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  }

  /**
   * Check if member exists with specific role
   */
  async hasMemberWithRole(
    collectionId: string,
    userId: string,
    roles: CollectionRole[]
  ): Promise<boolean> {
    const { data, error } = await this.query()
      .select('role')
      .eq('collection_id', collectionId)
      .eq('user_id', userId)
      .in('role', roles)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return !!data
  }

  /**
   * Get collection owners
   */
  async findOwners(collectionId: string) {
    const { data, error } = await this.query()
      .select(
        `
        *,
        profile:profiles!collection_members_user_id_fkey (
          id,
          name,
          email,
          avatar
        )
      `
      )
      .eq('collection_id', collectionId)
      .eq('role', CollectionRole.OWNER)

    if (error) throw error

    return (data || []) as unknown as CollectionMemberWithProfile[]
  }

  /**
   * Bulk add members to a collection
   */
  async bulkAddMembers(members: TablesInsert<'collection_members'>[]) {
    const { data, error } = await this.query().insert(members).select('*')

    if (error) throw error

    return data
  }

  /**
   * Update multiple members' roles
   */
  async bulkUpdateRoles(updates: { collection_id: string; user_id: string; role: CollectionRole }[]) {
    const promises = updates.map((update) =>
      this.updateMemberRole(update.collection_id, update.user_id, update.role)
    )

    return Promise.all(promises)
  }
}

export const collectionMemberRepo =
  globalThis._collectionMemberRepo ?? new CollectionMemberRepository()

if (process.env.NODE_ENV !== 'production') {
  globalThis._collectionMemberRepo = collectionMemberRepo
}
