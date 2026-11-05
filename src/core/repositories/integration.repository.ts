import { Tables, TablesUpdate } from '@/shared/types/database.types'
import { BaseRepository } from './base.repository'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { Integration } from '../types/integration.type'

export class IntegrationRepository extends BaseRepository<'integrations'> {
  constructor() {
    super('integrations')
  }

  async findOneById(
    id: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select().eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.single().overrideTypes<Integration>()
    if (error) throw error
    return data
  }

  async findAllWithModifier(
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select('*')
    if (modifier) query = modifier(query)
    const { data, error } = await query
    if (error) throw error
    return data
  }

  async updateAndGetOne(
    id: string,
    _data: TablesUpdate<'integrations'>,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().update(_data).eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.select('*').single().overrideTypes<Tables<'integrations'>>()
    if (error) throw error
    return data
  }
}

export const integrationRepo =
  process.env.NODE_ENV !== 'production'
    ? new IntegrationRepository()
    : globalThis._integrationRepo ?? (globalThis._integrationRepo = new IntegrationRepository())
