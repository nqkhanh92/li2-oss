import { supabaseService } from '@/infrastructure/database/supabase'
import { BaseRepository } from './base.repository'
import { Domain } from '../types/domain.type'

export class DomainRepository extends BaseRepository<'domains'> {
  constructor() {
    super('domains')
  }

  async findOrThrow(orgId: string, domainId: string) {
    const { data: domain, error } = await supabaseService
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .eq('is_verified', true)
      .or(`is_default.eq.true, organization_id.eq.${orgId}`)
      .returns<Domain>()
      .single()

    if (error) {
      throw error
    }
    return domain
  }

  /**
   * Get all default domains (system-wide domains available to all organizations)
   * @returns Array of default domains
   */
  async getDefaultDomains(): Promise<Domain[]> {
    const { data, error } = await supabaseService
      .from('domains')
      .select('*')
      .eq('is_default', true)
      .eq('is_verified', true)
      .returns<Domain[]>()

    if (error) {
      throw error
    }

    return data || []
  }

  /**
   * Get all domains for an organization
   * Includes both default domains and organization-specific domains
   * @param orgId - Organization ID
   * @returns Array of available domains
   */

  async getAllDomains(orgId: string): Promise<Domain[]> {
    const { data, error } = await supabaseService
      .from('domains')
      .select('*')
      .or(`is_default.eq.true,organization_id.eq.${orgId}`)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })
      .overrideTypes<Domain[]>()

    if (error) {
      throw error
    }

    return data || []
  }

  async getOrgDomains(orgId: string): Promise<Domain[]> {
    const { data, error } = await this.query()
      .select('*')
      .eq('organization_id', orgId)
      .order('name', { ascending: true })
      .overrideTypes<Domain[]>()

    if (error) {
      throw error
    }

    return data || []
  }

  /**
   * Get all available domains for an organization
   * Includes both default domains and organization-specific verified domains
   * @param orgId - Organization ID
   * @returns Array of available domains
   */
  async getAvailableDomains(orgId: string): Promise<Domain[]> {
    const { data, error } = await supabaseService
      .from('domains')
      .select('*')
      .eq('is_verified', true)
      .or(`is_default.eq.true,organization_id.eq.${orgId}`)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })
      .returns<Domain[]>()

    if (error) {
      throw error
    }

    return data || []
  }
}
export const domainRepo = globalThis._domainRepo ?? new DomainRepository()

if (process.env.NODE_ENV !== 'production') globalThis._domainRepo = domainRepo
