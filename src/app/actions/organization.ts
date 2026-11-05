'use server'
import { Organization } from '@/core/types/organization.type'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { validate } from 'uuid'

export async function getOrganizationById(orgIdentifier: string): Promise<Organization | null> {
  try {
    const supabase = await createServiceClient()
    let query = supabase.from('organizations').select('*, org_members(id)')

    if (validate(orgIdentifier)) {
      query = query.eq('id', orgIdentifier)
    } else {
      query = query.eq('org_slug', orgIdentifier)
    }
    const { data: org, error } = await query.single()
    if (error) {
      throw error
    }
    return org
  } catch (error: any) {
    console.log({ error })
    return null
  }
}

export async function getOrganizationSlugById(org_id: string): Promise<string | null> {
  try {
    if (!validate(org_id)) return null
    // const cachedSlug = await redis.get(`org_slug:${org_id}`)
    // if (cachedSlug) return cachedSlug

    const supabase = await createServiceClient()
    const query = supabase.from('organizations').select('*').eq('id', org_id)

    const { data: org, error } = await query.single()
    if (error) {
      throw error
    }
    if (!org || !org.org_slug) return null

    // redis.set(`org_slug:${org_id}`, org.org_slug)
    return org.org_slug
  } catch {
    return null
  }
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('org_slug', slug)
      .maybeSingle()

    if (error) {
      console.error('Error checking slug availability:', error)
      return { available: false }
    }

    return { available: !data }
  } catch (error) {
    console.error('Error checking slug availability:', error)
    return { available: false }
  }
}
