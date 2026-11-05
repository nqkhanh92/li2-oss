import { supabaseService } from '@/infrastructure/database/supabase'
import { BaseRepository } from './base.repository'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { AnonTouchPoint } from '../types/anon-touch-point.type'

export class AnonTouchPointRepository extends BaseRepository<'anon_touch_points'> {
  constructor() {
    super('anon_touch_points')
  }

  async getAnonTouchPointDetail(tpId: string, anonId: string) {
    const query = this.query().select('*').eq('id', tpId).eq('anon_id', anonId)
    const { data, error } = await query.single()
    if (error) {
      throw error
    }
    return data
  }

  async getAnonTouchPointList(anonId: string) {
    const { data, error } = await this.query()
      .select('*')
      .eq('anon_id', anonId)
      .returns<AnonTouchPoint[]>()
    if (error) {
      throw error
    }
    return data
  }

  async getNonMigratedAnonTouchPointList(anonId: string) {
    const { data, error } = await this.query()
      .select('*')
      .eq('anon_id', anonId)
      .is('migrated', false)
      .returns<AnonTouchPoint[]>()
    if (error) {
      throw error
    }
    return data
  }

  async countAnonTouchPoint(
    anonId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select('id, anon_id', { count: 'exact' }).eq('anon_id', anonId)
    if (modifier) {
      query = modifier(query)
    }
    const { error, count } = await query
    if (error) {
      throw error
    }
    return count
  }

  async getNextShortId() {
    const { data: nextShortId, error: nextShortIdError } = await supabaseService.rpc(
      'get_next_touch_point_short_id'
    )
    if (nextShortIdError) {
      throw nextShortIdError
    }
    return nextShortId
  }
}

export const anonTouchPointRepo =
  process.env.NODE_ENV !== 'production'
    ? new AnonTouchPointRepository()
    : globalThis._anonTouchPointRepo ??
      (globalThis._anonTouchPointRepo = new AnonTouchPointRepository())
