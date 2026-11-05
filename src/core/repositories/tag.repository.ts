import { BaseRepository } from '@/core/repositories/base.repository'
import { supabaseService } from '@/infrastructure/database/supabase'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { Tables, TablesUpdate } from '@/shared/types/database.types'

export class TagRepository extends BaseRepository<'tags'> {
  constructor() {
    super('tags')
  }

  async findAllWithModifier(
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().select('*, tp_tag_links(count), profiles(id, email, avatar)', {
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
    let query = this.query().select('*, profiles ( id, name, email, avatar )').eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.single()
    if (error) throw error
    return data
  }

  async updateAndGetOne(
    id: string,
    _data: TablesUpdate<'tags'>,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().update(_data).eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.select('*').single()
    if (error) throw error
    return data
  }

  async bulkLinkTags(tpId: string, tagIds: string[]) {
    const { data, error } = await supabaseService.from('tp_tag_links').insert(
      tagIds.map((tagId) => ({
        tag_id: tagId,
        tp_id: tpId,
      }))
    )
    if (error) throw error
    return data
  }

  async setTagsForTp(tpId: string, tagIds: string[]) {
    const { error } = await supabaseService.rpc('update_tp_tag_links', {
      input_tp_id: tpId,
      input_tag_ids: tagIds,
    })
    if (error) throw error
    return true
  }

  async bulkDeleteAndGet(
    ids: string[],
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query().delete().in('id', ids)
    if (modifier) query = modifier(query)
    const { data, error } = await query.select('*')
    if (error) throw error
    return data
  }
}

export const tagRepo = globalThis._tagRepo ?? new TagRepository()

if (process.env.NODE_ENV !== 'production') globalThis._tagRepo = tagRepo
