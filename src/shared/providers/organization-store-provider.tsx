'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { validate } from 'uuid'
import {
  RolePermission,
  RolePermissionKey,
  RolePermissionScope,
} from '@/shared/types/role-permission'
import { hasPermission as checkPermission } from '@/shared/lib/permission/check-permission'
import { OrganizationStoreState, useOrganizationStore } from '@/shared/stores/organization-store'
import {
  OrganizationAICredit,
  OrganizationPlan,
  PlanLimitKey,
} from '@/shared/types/plan-permission'
import { Organization } from '@/app/api/organizations/route'
import { useProfileProvider } from './auth-provider'
import { useGetOrganizationAICredits } from '@/features/organizations/hooks/queries/org-credit'
import { LoadingOverlay } from '../components/customize/loading-overlay'
import { setAutoDefault } from '@/shared/lib/org-preference'

// Context is only needed for provider pattern, not required for actual state management
/**
 * Context value for organization provider.
 *
 * - `is_org_member` and `is_org_owner` are `boolean | undefined`.
 *   - `undefined`: status is loading or unknown
 *   - `true`/`false`: status is determined
 * - `hasPermission`: checks if the user has a given permission.
 * - `switchOrganization`: switches to a new organization and updates route/localStorage.
 */
type OrganizationContextValue = OrganizationStoreState & {
  /** Switch to a new organization by ID. */
  switchOrganization: (new_org_id: string) => void
  /** Whether organization data is loading. */
  isLoading: boolean
  /** Whether permissions data is loading. */
  isLoadingPermission: boolean
  /** Whether organization plan data is loading. */
  // isLoadingOrgPlan: boolean;
  /**
   * Check if the user has a specific permission.
   * @param permissionKey - The permission key to check.
   * @param scope - Optional permission scope.
   * @returns true if the user has the permission, false otherwise.
   */
  hasPermission: (permissionKey: RolePermissionKey, scope?: RolePermissionScope) => boolean
  orgRouterPush: (path: string, replace?: boolean) => void
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

/**
 * Provides organization state and permission utilities to the React component tree.
 *
 * - Fetches organization and permissions for the given org_id.
 * - While loading, `is_org_member` and `is_org_owner` are `undefined` (unknown/loading).
 * - After fetching, these are set to `true` or `false`.
 * - Exposes `hasPermission` and `switchOrganization` helpers via context.
 */
const OrganizationProvider = ({
  children,
  organization,
  permissions,
  orgPlan,
  org_id,
}: {
  children: React.ReactNode
  organization: Organization | null
  permissions: RolePermission[] | null
  orgPlan: OrganizationPlan | null
  org_id: string
}) => {
  const router = useRouter()
  const { t } = useTranslation('common')
  //   useGetOrgPermissions(org_id);
  // const { data: orgPlan, isLoading: isLoadingOrgPlan } = useGetOrgPlan(org_id);
  const store = useOrganizationStore()
  // const { data: orgAICredits } = useGetOrganizationAICredits(org_id)
  const { profile } = useProfileProvider()

  useEffect(() => {
    if (!organization) return
    store.setOrganization(organization)
  }, [organization])
  useEffect(() => {
    if (!organization || !profile) return

    const isOwner = organization.user_id === profile?.id
    store.setIsOrgOwner(isOwner)

    //HANDLE SETUP ORG
    if (isOwner && !organization.org_slug) {
      router.replace(`/setup/${organization.id}`)
    }
  }, [organization, profile])

  useEffect(() => {
    if (!orgPlan) return
    store.setPlan(orgPlan)
  }, [orgPlan])

  useEffect(() => {
    if (!permissions || permissions.length === 0) {
      store.setPermissions(null)
      store.setIsOrgMember(false)
      store.setIsOrgOwner(false)
      return
    }
    store.setIsOrgMember(true)
    store.setPermissions(permissions)
  }, [permissions])

  // useEffect(() => {
  //   if (!orgAICredits) return
  //   store.setAICredits(orgAICredits || null)
  // }, [orgAICredits])

  const hasPermission = React.useCallback(
    (permissionKey: RolePermissionKey, scope?: RolePermissionScope) => {
      if (!permissions) return false
      return checkPermission(permissions, permissionKey, scope)
    },
    [permissions]
  )

  const switchOrganization = React.useCallback(
    (new_org_id: string) => {
      store.setIsSwitchingOrg(true)
      if (profile?.id) setAutoDefault(profile.id, new_org_id)
      router.replace(`/org/${new_org_id}`)
      // Don't set false here - let the new page reset it when loaded
    },
    [router, store, profile?.id]
  )

  const orgRouterPush = React.useCallback(
    (_path: string, replace?: boolean) => {
      const path = _path.startsWith('/') ? _path : `/${_path}`
      if (replace) {
        router.replace(`/org/${organization?.org_slug ?? org_id}${path}`)
      } else {
        router.push(`/org/${organization?.org_slug ?? org_id}${path}`)
      }
    },
    [router, organization, org_id]
  )

  // Reset switching state when organization data is loaded
  React.useEffect(() => {
    if (
      organization &&
      (organization.id === org_id || organization.org_slug === org_id) &&
      store.isSwitchingOrg
    ) {
      // Small delay to ensure UI has updated
      const timer = setTimeout(() => {
        store.setIsSwitchingOrg(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [organization, store])

  return (
    <OrganizationContext.Provider
      value={{
        ...store,
        switchOrganization,
        isLoading: false,
        isLoadingPermission: false,
        // isLoadingOrgPlan,
        hasPermission,
        orgRouterPush,
      }}
    >
      {store.isSwitchingOrg && <LoadingOverlay message={t('loading.switching_organization')} />}
      {children}
    </OrganizationContext.Provider>
  )
}
const useOrganizationStoreProvider = (): OrganizationContextValue => {
  const ctx = React.useContext(OrganizationContext)
  if (!ctx) throw Error(`Lack of provider`)
  return ctx
}

export { OrganizationProvider, useOrganizationStoreProvider }
