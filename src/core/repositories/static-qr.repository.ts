import { BaseRepository } from '@/core/repositories/base.repository'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { TablesUpdate } from '@/shared/types/database.types'

export class StaticQrRepository extends BaseRepository<'static_qr'> {
  constructor() {
    super('static_qr')
  }

  async findAllWithModifier(
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select('*, profiles(id, email, name)', {
      count: 'exact',
    })
    if (modifier) query = modifier(query)
    const { data, error, count } = await query
    if (error) throw error
    return { data, count }
  }

  async findOneById(
    id: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select('*, profiles(id, name, email)').eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.single()
    if (error) throw error
    return data
  }

  async updateAndGetOne(
    id: string,
    _data: TablesUpdate<'static_qr'>,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().update(_data).eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.select('*').single()
    if (error) throw error
    return data
  }

  async deleteAndGetOne(
    id: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().delete().eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.select('*').single()
    if (error) throw error
    return data
  }
}

export const staticQrRepo = globalThis._staticQrRepo ?? new StaticQrRepository()

if (process.env.NODE_ENV !== 'production') globalThis._staticQrRepo = staticQrRepo
