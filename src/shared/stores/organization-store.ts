import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Organization } from '@/app/api/organizations/route'
import {
  RolePermission,
  RolePermissionKey,
  RolePermissionScope,
} from '@/shared/types/role-permission'
import { OrganizationAICredit, OrganizationPlan } from '@/shared/types/plan-permission'

/**
 * Organization-related state values for the store.
 *
 * - `is_org_member` and `is_org_owner` are `boolean | undefined`.
 *   - `undefined` means the membership/ownership status is still loading or unknown.
 *   - `true` or `false` means the status has been determined after fetching.
 */
interface OrganizationValue {
  /** The current organization, or null if not loaded. */
  organization: Organization | null
  /** Permissions for the current organization, or null if not loaded. */
  permissions: RolePermission[] | null
  /**
   * Whether the user is a member of the organization.
   * - `undefined`: still loading or unknown
   * - `true`/`false`: status determined
   */
  isOrgMember?: boolean
  /**
   * Whether the user is the owner of the organization.
   * - `undefined`: still loading or unknown
   * - `true`/`false`: status determined
   */
  isOrgOwner?: boolean

  /** The current organization plan, or null if not loaded. */
  orgPlan: OrganizationPlan | null

  /** The current organization AI credits, or null if not loaded. */
  // aiCredits: OrganizationAICredit | null;

  isSwitchingOrg: boolean
}
/**
 * Methods for updating the organization store state.
 */
interface OrganizationMethod {
  /** Set the current organization. */
  setOrganization: (organization: Organization | null) => void
  /** Set the permissions for the current organization. */
  setPermissions: (permissions: RolePermission[] | null) => void
  /** Set the organization membership status. */
  setIsOrgMember: (isOrgMember: boolean) => void
  /** Set the organization ownership status. */
  setIsOrgOwner: (isOrgOwner: boolean) => void
  /** Set the organization plan. */
  setPlan: (plan: OrganizationPlan | null) => void
  /** Set the organization AI credits. */
  // setAICredits: (aiCredits: OrganizationAICredit | null) => void;
  setIsSwitchingOrg: (isSwitchingOrg: boolean) => void
}
export type OrganizationStoreState = OrganizationValue & OrganizationMethod

/**
 * Zustand store for managing organization state and permissions.
 *
 * - Use `is_org_member` and `is_org_owner` as `undefined` to represent loading/unknown state.
 * - Set to `true`/`false` after fetching completes.
 * - Persisted to localStorage to survive page refreshes
 */
export const useOrganizationStore = create<OrganizationStoreState>()(
  persist(
    (set) => ({
      organization: null,
      permissions: null,
      isOrgMember: undefined,
      isOrgOwner: undefined,
      orgPlan: null,
      // aiCredits: null,
      isSwitchingOrg: false,
      setOrganization: (organization: Organization | null) => {
        // Store org ID in cookie for middleware access
        if (organization?.id && organization.org_slug) {
          document.cookie = `slugMapping=${organization.id}:${organization.org_slug}; path=/; max-age=600; SameSite=Lax`
        }

        return set({ organization })
      },
      setPermissions: (permissions: RolePermission[] | null) => set({ permissions }),
      setIsOrgMember: (isOrgMember: boolean) => set({ isOrgMember }),
      setIsOrgOwner: (isOrgOwner: boolean) => set({ isOrgOwner }),
      setPlan: (plan: OrganizationPlan | null) => set({ orgPlan: plan }),
      // setAICredits: (aiCredits: OrganizationAICredit | null) => set({ aiCredits }),
      setIsSwitchingOrg: (isSwitchingOrg: boolean) => set({ isSwitchingOrg }),
    }),
    {
      name: 'organization-storage',
      partialize: (state) => ({
        organization: state.organization,
        permissions: state.permissions,
        isOrgMember: state.isOrgMember,
        isOrgOwner: state.isOrgOwner,
        orgPlan: state.orgPlan,
      }),
    }
  )
)
