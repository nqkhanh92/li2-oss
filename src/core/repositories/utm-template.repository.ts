import { BaseRepository } from '@/core/repositories/base.repository'
import { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import {
  CreateUTMTemplate,
  UpdateUTMTemplate,
  UTMTemplate,
  UTMTemplateListItem,
} from '../types/utm-template.type'

export class UTMTemplateRepository extends BaseRepository<'utm_templates'> {
  constructor() {
    super('utm_templates')
  }

  async findByOrgId(
    orgId: string,
    modifier: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ): Promise<{
    data: UTMTemplateListItem[]
    rowCount: number | null
  }> {
    let query = this.query()
      .select('*, created_by(id, name, email, avatar)', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (modifier) {
      query = modifier(query)
    }

    const { data, error, count } = await query.overrideTypes<UTMTemplateListItem[]>()

    if (error) throw error

    return { data: data, rowCount: count }
  }

  async findByOrgIdAndName(orgId: string, name: string): Promise<UTMTemplate | null> {
    const { data, error } = await this.query()
      .select('*')
      .eq('organization_id', orgId)
      .eq('name', name)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return (data as UTMTemplate) || null
  }

  async createForOrg(
    orgId: string,
    data: Omit<CreateUTMTemplate, 'organization_id' | 'created_by'>,
    userId: string
    // modifier: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>,
  ): Promise<UTMTemplate> {
    return this.create({
      ...data,
      organization_id: orgId,
      created_by: userId,
    } as CreateUTMTemplate)
  }

  async updateInOrg(
    id: string,
    orgId: string,
    data: UpdateUTMTemplate,
    modifier?: (
      query: PostgrestFilterBuilder<any, any, any>
    ) => PostgrestFilterBuilder<any, any, any>
  ): Promise<UTMTemplate> {
    // Verify the template belongs to the org
    const template = await this.findById(id)
    if (!template || template.organization_id !== orgId) {
      throw new Error('Template not found or does not belong to organization')
    }
    let query = this.query().update(data).eq('id', id).eq('organization_id', orgId)
    if (modifier) {
      query = modifier(query)
    }
    const { data: utmTemplate, error } = await query.select('*').single()
    if (error) throw error
    return utmTemplate
  }

  async deleteFromOrg(
    ids: string[],
    orgId: string,
    modifier?: (
      query: PostgrestFilterBuilder<any, any, any>
    ) => PostgrestFilterBuilder<any, any, any>
  ) {
    // Verify the template belongs to the org
    // const template = await this.findById(id)
    // if (!template || (template as any).organization_id !== orgId) {
    //   throw new Error('Template not found or does not belong to organization')
    // }
    let query = this.query().delete({ count: 'exact' }).in('id', ids).eq('organization_id', orgId)

    // let query = this.query().delete().eq('id', id).eq('organization_id', orgId)
    if (modifier) {
      query = modifier(query)
    }
    const { data, error, count } = await query.select('*')
    if (error) throw error
    return { data, count: count || 0 }
  }

  async countByOrgId(orgId: string): Promise<number> {
    const { count, error } = await this.query()
      .select('id', { count: 'exact' })
      .eq('organization_id', orgId)

    if (error) throw error
    return count ?? 0
  }
}

declare global {
  // eslint-disable-next-line no-var
  var _utmTemplateRepo: UTMTemplateRepository | undefined
}

export const utmTemplateRepo = globalThis._utmTemplateRepo ?? new UTMTemplateRepository()

if (process.env.NODE_ENV !== 'production') globalThis._utmTemplateRepo = utmTemplateRepo
