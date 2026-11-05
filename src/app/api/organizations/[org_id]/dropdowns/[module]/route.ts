'use server'

import { NextRequest, NextResponse } from 'next/server'
import { Database, Tables } from '@/shared/types/database.types'
import { ensureOrgMember, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { AppError, UnauthorizedError } from '@/infrastructure/response/errors/domain.errors'
import { createServiceClient } from '@/infrastructure/database/supabase/server'
import { memberRepo } from '@/core/repositories/member.repository'
import { ROLE_PERMISSION_KEYS, RolePermissionScope } from '@/shared/types/role-permission'
import { collectionPermissionService } from '@/core/services/collection-permission.service'
import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { parseDeepLinkConfig } from '@/shared/schemas/custom-domains'

import { logger } from '@/infrastructure/logging/logger'
import { getSession } from '@/shared/lib/auth/session'
import { BaseError } from '@/infrastructure/response/errors/base.error'

const log = logger.child({ module: 'dropdowns_route' })

type TableNames = keyof Database['public']['Tables']

const allowedModules = [
  'campaigns',
  'tags',
  'organizations',
  'touch_points',
  'assets',
  'domains',
  'integrations',
  'campaign_channels',
] as const
type AllowedModuleNames = (typeof allowedModules)[number]

type DropdownFieldMapping = {
  tags: Pick<Tables<'tags'>, 'id' | 'name' | 'color'>[]
  campaign_channels: Pick<Tables<'campaign_channels'>, 'id' | 'name' | 'color'>[]
  domains: Pick<Tables<'domains'>, 'id' | 'name' | 'is_default' | 'default_selected'>[]
  touch_points: (Pick<Tables<'touch_points'>, 'id' | 'name' | 'slug' | 'content_value' | 'collection_id'> & {
    tp_tag_links: {
      tag_id: string
      tags: Pick<Tables<'tags'>, 'id' | 'name' | 'color'>
    }[]
  })[]
  integrations: Pick<Tables<'integrations'>, 'id' | 'name' | 'type'>[]
}

export type DropdownData<K extends AllowedModuleNames> = K extends keyof DropdownFieldMapping
  ? DropdownFieldMapping[K]
  : Pick<Tables<K>, 'id' | 'name'>[]

export async function GET(
  request: NextRequest,
  { params }: { params: { org_id: string; module: AllowedModuleNames } }
) {
  try {
    const session = await getSession()
    if (!session) throw new UnauthorizedError()

    await ensureOrgMember(params.org_id)
    const supabase = await createServiceClient()

    // Permission filtering for tags and touch_points
    let needsFiltering = false
    let accessibleCollectionIds: string[] = []
    let uncategorizedScope: RolePermissionScope | null = null // null = no access, ALL = all uncategorized, OWN = only user's own
    let currentUserId: string | null = null

    // Deep-link picker filter (touch_points module only). When `?deep_link_only=true`,
    // intersect the query with touch-points whose domain has deep-link enabled. The
    // predicate must match the deep-link RPCs (get_deep_link_click_summary /
    // _click_timeseries / _ranking): is_verified=true AND deep_link_apps.enabled=true
    // AND apps[]>0. We pre-fetch eligible domain IDs (small set per org) and
    // constrain via .in('domain_id', ids) on both the non-owner and owner paths
    // below.
    let deepLinkDomainIds: string[] | null = null
    const deepLinkOnly =
      params.module === 'touch_points' &&
      request.nextUrl.searchParams.get('deep_link_only') === 'true'

    // remove tag filter params.module === 'tags' ||
    if (params.module === 'touch_points') {
      currentUserId = session.sub

      // Check if user is Owner (bypass all restrictions)
      const isOwner = await memberRepo.isOrganizationOwner(params.org_id, currentUserId)

      if (!isOwner) {
        // All non-owners get filtered by accessible collections
        needsFiltering = true
        accessibleCollectionIds = await collectionPermissionService.getAccessibleCollectionIds(
          params.org_id,
          currentUserId
        )

        // Determine uncategorized access based on VIEW_TOUCH_POINTS scope
        try {
          uncategorizedScope = await getPermissionScopeOrThrow(
            params.org_id,
            ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS
          )
        } catch {
          // No VIEW_TOUCH_POINTS permission = no uncategorized access
          uncategorizedScope = null
        }
      }
    }

    // Resolve eligible deep-link domain IDs once. Supabase-JS can't express a
    // JSONB `->>'enabled' = 'true'` predicate ergonomically, so we narrow by
    // is_verified + deep_link_apps NOT NULL server-side, then finish the JSONB
    // shape check in JS. Domain rows per org are tiny (a few at most), so this
    // is cheap. Includes default domains via `is_default.eq.true` (defensive —
    // default domains today don't carry deep_link_apps but the predicate is
    // safely inclusive).
    if (deepLinkOnly) {
      const { data: dlDomains, error: dlErr } = await supabase
        .from('domains')
        .select('id, deep_link_apps')
        .eq('is_verified', true)
        .not('deep_link_apps', 'is', null)
        .or(`is_default.eq.true,organization_id.eq.${params.org_id}`)
      if (dlErr) {
        log.info({ dlErr })
        throw Error('Error when fetching deep-link domains for dropdown!')
      }
      deepLinkDomainIds = (dlDomains ?? [])
        .filter((d) => {
          // parseDeepLinkConfig is the canonical narrowing for this JSONB column
          // (shared with the verify-deep-link route + config panel). It's a cast,
          // not validation — keep the Array.isArray guard for old/partial rows.
          const cfg = parseDeepLinkConfig(d.deep_link_apps)
          return cfg?.enabled === true && Array.isArray(cfg.apps) && cfg.apps.length > 0
        })
        .map((d) => d.id)
      if (deepLinkDomainIds.length === 0) {
        return NextResponse.json([])
      }
    }

    if (allowedModules.includes(params.module)) {
      let query
      switch (params.module) {
        case 'campaign_channels':
          query = supabase
            .from(params.module)
            .select('id, name, color')
            .eq('organization_id', params.org_id)
          break
        case 'tags':
          if (needsFiltering) {
            // Non-owner with no accessible collections and no uncategorized access - return empty
            if (accessibleCollectionIds.length === 0 && uncategorizedScope === null) {
              return NextResponse.json([])
            }

            // For non-owners, we need to get tags from accessible touch-points
            // First, get touch-point IDs that match our collection criteria
            let tpIdsQuery = supabase
              .from('touch_points')
              .select('id')
              .eq('organization_id', params.org_id)

            if (uncategorizedScope === RolePermissionScope.ALL) {
              // Include TPs from accessible collections OR all uncategorized
              if (accessibleCollectionIds.length > 0) {
                tpIdsQuery = tpIdsQuery.or(
                  `collection_id.in.(${accessibleCollectionIds.join(',')}),collection_id.is.null`
                )
              } else {
                tpIdsQuery = tpIdsQuery.is('collection_id', null)
              }
            } else if (uncategorizedScope === RolePermissionScope.OWN && currentUserId) {
              // Include TPs from accessible collections OR user's own uncategorized
              if (accessibleCollectionIds.length > 0) {
                tpIdsQuery = tpIdsQuery.or(
                  `collection_id.in.(${accessibleCollectionIds.join(',')}),and(collection_id.is.null,user_id.eq.${currentUserId})`
                )
              } else {
                tpIdsQuery = tpIdsQuery.is('collection_id', null).eq('user_id', currentUserId)
              }
            } else {
              // No uncategorized access - only from accessible collections
              if (accessibleCollectionIds.length === 0) {
                return NextResponse.json([])
              }
              tpIdsQuery = tpIdsQuery.in('collection_id', accessibleCollectionIds)
            }

            const { data: tpIds, error: tpIdsError } = await tpIdsQuery
            if (tpIdsError) {
              log.info({ tpIdsError })
              throw Error('Error when fetching touch-point IDs for tags dropdown!')
            }

            if (!tpIds || tpIds.length === 0) {
              return NextResponse.json([])
            }

            // Now get tags linked to these touch-points
            const { data: tagsData, error: tagsError } = await supabase
              .from('tp_tag_links')
              .select('tags!inner(id, name, color)')
              .in(
                'tp_id',
                tpIds.map((tp) => tp.id)
              )

            if (tagsError) {
              log.info({ tagsError })
              throw Error('Error when fetching tags dropdown!')
            }

            // Deduplicate tags and return only id, name, color
            const uniqueTags = Array.from(
              new Map(
                tagsData
                  ?.filter((t) => t.tags)
                  .map((t) => [
                    t.tags.id,
                    { id: t.tags.id, name: t.tags.name, color: t.tags.color },
                  ])
              ).values()
            )
            return NextResponse.json(uniqueTags)
          }
          // Owner: Return all tags
          query = supabase
            .from('tags')
            .select('id, name, color')
            .eq('organization_id', params.org_id)
          break
        case 'touch_points':
          if (needsFiltering) {
            // Non-owner with no accessible collections and no uncategorized access - return empty
            if (accessibleCollectionIds.length === 0 && uncategorizedScope === null) {
              return NextResponse.json([])
            }

            // Build query for touch-points from accessible collections
            let tpQuery = supabase
              .from(params.module)
              .select(
                'id, name, slug, content_value, collection_id, tp_tag_links(id, tag_id, tags(id, name, color))'
              )
              .eq('organization_id', params.org_id)

            if (uncategorizedScope === RolePermissionScope.ALL) {
              // Include touch-points from accessible collections OR all uncategorized
              if (accessibleCollectionIds.length > 0) {
                tpQuery = tpQuery.or(
                  `collection_id.in.(${accessibleCollectionIds.join(',')}),collection_id.is.null`
                )
              } else {
                tpQuery = tpQuery.is('collection_id', null)
              }
            } else if (uncategorizedScope === RolePermissionScope.OWN && currentUserId) {
              // Include touch-points from accessible collections OR user's own uncategorized
              if (accessibleCollectionIds.length > 0) {
                tpQuery = tpQuery.or(
                  `collection_id.in.(${accessibleCollectionIds.join(',')}),and(collection_id.is.null,user_id.eq.${currentUserId})`
                )
              } else {
                tpQuery = tpQuery.is('collection_id', null).eq('user_id', currentUserId)
              }
            } else {
              // No uncategorized access - only from accessible collections
              if (accessibleCollectionIds.length === 0) {
                return NextResponse.json([])
              }
              tpQuery = tpQuery.in('collection_id', accessibleCollectionIds)
            }

            if (deepLinkDomainIds) {
              tpQuery = tpQuery.in('domain_id', deepLinkDomainIds)
            }
            const { data: tpData, error: tpError } = await tpQuery
            if (tpError) {
              throw Error('Error when fetching dropdown!')
            }
            return NextResponse.json(tpData)
          }
          // Owner: Return all touch-points
          query = supabase
            .from(params.module)
            .select(
              'id, name, slug, content_value, collection_id, tp_tag_links(id, tag_id, tags(id, name, color))'
            )
            .eq('organization_id', params.org_id)
          if (deepLinkDomainIds) {
            query = query.in('domain_id', deepLinkDomainIds)
          }
          break
        case 'domains':
          // Query both default domains (system-wide) and org-specific verified domains
          query = supabase
            .from(params.module)
            .select('id, name, is_default, default_selected')
            .eq('is_verified', true)
            .or(`is_default.eq.true,organization_id.eq.${params.org_id}`)
            .order('is_default', { ascending: false }) // Show default domains first
            .order('name', { ascending: true })
          break
        case 'integrations':
          query = supabase.from(params.module).select('id, name, type').eq('org_id', params.org_id)
          break
        default:
          query = supabase
            .from(params.module)
            .select('id, name')
            .eq('organization_id', params.org_id)
      }
      const { data, error } = await query
      if (error) {
        throw Error('Error when fetching dropdown!')
      }
      return NextResponse.json(data)
    }
    throw Error('Module not allowed!')
  } catch (error: any) {
    log.error({ route: request.url, err: error })
    if (error instanceof BaseError) {
      return error.toResponse()
    }

    return new AppError(error?.message).toResponse()
  }
}
