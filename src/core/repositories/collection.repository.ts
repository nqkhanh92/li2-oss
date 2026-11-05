import { BaseRepository } from './base.repository'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { CollectionWithStats } from '@/shared/types/collection.types'

export class CollectionRepository extends BaseRepository<'collections'> {
  constructor() {
    super('collections')
  }

  /**
   * Find all collections by organization ID
   */
  async findAllByOrganization(
    orgId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    if (modifier) query = modifier(query)

    const { data, error, count } = await query
    if (error) throw error

    return { data, count }
  }

  /**
   * Find collection by ID with organization check
   */
  async getCollectionById(
    orgId: string,
    collectionId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select('*')
      .eq('id', collectionId)
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    if (modifier) query = modifier(query)

    const { data, error } = await query.single()
    if (error) throw error

    return data
  }

  /**
   * Find collection with stats (touch points count, members count)
   */
  async findByIdWithStats(orgId: string, collectionId: string) {
    const { data, error } = await this.query()
      .select(
        `
        *,
        touch_points_count:touch_points(count),
        members_count:collection_members(count),
        profiles(id, name, email)
      `
      )
      .eq('id', collectionId)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    // Transform the count data
    const collection: CollectionWithStats = {
      ...data,
      touch_points_count: Array.isArray(data.touch_points_count)
        ? data.touch_points_count[0]?.count || 0
        : 0,
      members_count: Array.isArray(data.members_count) ? data.members_count[0]?.count || 0 : 0,
      creator: {
        id: data.profiles?.id || '',
        name: data.profiles?.name || '',
        email: data.profiles?.email || '',
      },
    }

    return collection
  }

  /**
   * Find all collections with stats
   */
  async findAllByOrganizationWithStats(
    orgId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select(
        `
        *,
        touch_points_count:touch_points(count),
        members_count:collection_members(count)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    if (modifier) query = modifier(query)

    const { data, error, count } = await query

    if (error) throw error

    // Transform the count data
    const collections: CollectionWithStats[] =
      data?.map((item) => ({
        ...item,
        touch_points_count: Array.isArray(item.touch_points_count)
          ? item.touch_points_count[0]?.count || 0
          : 0,
        members_count: Array.isArray(item.members_count) ? item.members_count[0]?.count || 0 : 0,
      })) || []

    return { data: collections, count }
  }

  /**
   * Create a new collection
   * Note: Counter is automatically updated by database trigger
   */
  async createCollection(data: TablesInsert<'collections'>) {
    const { data: collection, error } = await this.query().insert(data).select('*').single()

    if (error) throw error

    return collection
  }

  /**
   * Update a collection
   */
  async updateCollection(orgId: string, collectionId: string, data: TablesUpdate<'collections'>) {
    const { data: collection, error } = await this.query()
      .update(data)
      .eq('id', collectionId)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .select('*')
      .single()

    if (error) throw error

    return collection
  }

  /**
   * Soft delete a collection
   * Note: Counter is automatically updated by database trigger
   */
  async softDelete(orgId: string, collectionId: string) {
    const { error } = await this.query()
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', collectionId)
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    if (error) throw error

    return true
  }

  /**
   * Hard delete a collection (use with caution)
   */
  async hardDelete(orgId: string, collectionId: string) {
    const { error } = await this.query()
      .delete()
      .eq('id', collectionId)
      .eq('organization_id', orgId)

    if (error) throw error

    return true
  }

  /**
   * Count collections by organization (excluding deleted)
   */
  async countByOrganization(orgId: string): Promise<number> {
    const { count, error } = await this.query()
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    if (error) throw error

    return count || 0
  }

  /**
   * Check if a collection name exists in the organization
   */
  async existsByName(orgId: string, name: string, excludeId?: string): Promise<boolean> {
    let query = this.query()
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', name)
      .is('deleted_at', null)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected
      throw error
    }

    return !!data
  }
}

export const collectionRepo = globalThis._collectionRepo ?? new CollectionRepository()

if (process.env.NODE_ENV !== 'production') {
  globalThis._collectionRepo = collectionRepo
}
