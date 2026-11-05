import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

/**
 * Touch-Point Permission Result
 */
export interface TouchPointPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  isLoading: boolean
  error: Error | null
}

/**
 * Hook to check permissions for a specific touch-point
 * This checks both collection-level and org-level permissions
 *
 * @param touchPointId - The touch-point ID to check permissions for
 * @returns Permission flags and loading state
 */
export function useTouchPointPermissions(touchPointId?: string): TouchPointPermissions {
  const params = useParams()
  const orgId = params?.org_id as string

  const [permissions, setPermissions] = useState<TouchPointPermissions>({
    canView: false,
    canEdit: false,
    canDelete: false,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    if (!touchPointId || !orgId) {
      setPermissions({
        canView: false,
        canEdit: false,
        canDelete: false,
        isLoading: false,
        error: null,
      })
      return
    }

    const checkPermissions = async () => {
      try {
        setPermissions((prev) => ({ ...prev, isLoading: true }))

        // Call API to check permissions
        const response = await fetch(
          `/api/organizations/${orgId}/touch-points/${touchPointId}/permissions`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch permissions')
        }

        const data = await response.json()

        setPermissions({
          canView: data.canView ?? false,
          canEdit: data.canEdit ?? false,
          canDelete: data.canDelete ?? false,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        setPermissions({
          canView: false,
          canEdit: false,
          canDelete: false,
          isLoading: false,
          error: error as Error,
        })
      }
    }

    checkPermissions()
  }, [touchPointId, orgId])

  return permissions
}

/**
 * Hook to check if user can perform a specific action on a touch-point
 * Simpler version that just checks one permission
 *
 * @param touchPointId - The touch-point ID
 * @param action - The action to check ('view' | 'edit' | 'delete')
 * @returns Boolean indicating if user can perform the action
 */
export function useCanPerformTouchPointAction(
  touchPointId: string | undefined,
  action: 'view' | 'edit' | 'delete'
): boolean {
  const permissions = useTouchPointPermissions(touchPointId)

  if (permissions.isLoading || permissions.error) {
    return false
  }

  switch (action) {
    case 'view':
      return permissions.canView
    case 'edit':
      return permissions.canEdit
    case 'delete':
      return permissions.canDelete
    default:
      return false
  }
}

/**
 * Bulk permission check for multiple touch-points
 * Useful for determining which actions to show in lists
 *
 * @param touchPoints - Array of touch-point objects with id and collection_id
 * @returns Map of touch-point ID to permissions
 */
export function useBulkTouchPointPermissions(
  touchPoints: Array<{ id: string; collection_id?: string | null; user_id?: string }>
) {
  const params = useParams()
  const orgId = params?.org_id as string

  const [permissionsMap, setPermissionsMap] = useState<
    Map<string, Omit<TouchPointPermissions, 'isLoading' | 'error'>>
  >(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!touchPoints || touchPoints.length === 0 || !orgId) {
      setPermissionsMap(new Map())
      setIsLoading(false)
      return
    }

    const checkBulkPermissions = async () => {
      try {
        setIsLoading(true)

        const response = await fetch(
          `/api/organizations/${orgId}/touch-points/permissions/bulk`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              touchPointIds: touchPoints.map((tp) => tp.id),
            }),
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch bulk permissions')
        }

        const data = await response.json()
        const newMap = new Map<string, Omit<TouchPointPermissions, 'isLoading' | 'error'>>()

        data.permissions.forEach(
          (perm: {
            touchPointId: string
            canView: boolean
            canEdit: boolean
            canDelete: boolean
          }) => {
            newMap.set(perm.touchPointId, {
              canView: perm.canView,
              canEdit: perm.canEdit,
              canDelete: perm.canDelete,
            })
          }
        )

        setPermissionsMap(newMap)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching bulk permissions:', error)
        setPermissionsMap(new Map())
        setIsLoading(false)
      }
    }

    checkBulkPermissions()
  }, [touchPoints, orgId])

  return { permissionsMap, isLoading }
}
