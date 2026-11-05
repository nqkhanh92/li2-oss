import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse } from '@/shared/types'
import {
  CreateCollectionInput,
  UpdateCollectionInput,
  AddCollectionMemberInput,
  UpdateCollectionMemberInput,
  BulkAddCollectionMembersInput,
  AddTouchPointToCollectionInput,
  BulkAddTouchPointsToCollectionInput,
} from '@/shared/schemas/collections'
import { Collection, CollectionMember } from '@/shared/types/collection.types'

/**
 * Create a new collection
 */
export const useCreateCollection = (org_id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCollectionInput) => {
      return await axiosApiInstance.post<APIResponse<Collection>>(
        `/organizations/${org_id}/collections`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections'],
      })
    },
  })
}

/**
 * Update a collection
 */
export const useUpdateCollection = (org_id: string, collection_id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateCollectionInput) => {
      return await axiosApiInstance.patch<APIResponse<Collection>>(
        `/organizations/${org_id}/collections/${collection_id}`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id],
      })
    },
  })
}

/**
 * Delete a collection
 */
export const useDeleteCollection = (org_id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (collection_id: string) => {
      return await axiosApiInstance.delete(
        `/organizations/${org_id}/collections/${collection_id}`
      )
    },
    onSuccess: (_data, collection_id) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections'],
      })
      queryClient.removeQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id],
      })
      // Invalidate touch-points as they may have been removed from collection
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })
    },
  })
}

/**
 * Add touch-points to a collection
 */
export const useAddTouchPointsToCollection = (org_id: string, collection_id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      data: AddTouchPointToCollectionInput | BulkAddTouchPointsToCollectionInput
    ) => {
      return await axiosApiInstance.post(
        `/organizations/${org_id}/collections/${collection_id}/touch-points`,
        data
      )
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id, 'touch-points'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })

      // Remove specific touch-point cache entries
      if ('touch_point_id' in vars) {
        queryClient.removeQueries({
          queryKey: ['organizations', org_id, 'touch-points', vars.touch_point_id],
          exact: true,
        })
      } else if ('touch_point_ids' in vars) {
        vars.touch_point_ids.forEach((id) => {
          queryClient.removeQueries({
            queryKey: ['organizations', org_id, 'touch-points', id],
            exact: true,
          })
        })
      }
    },
  })
}

/**
 * Remove touch-points from a collection
 */
export const useRemoveTouchPointsFromCollection = (org_id: string, collection_id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (touch_point_ids: string[]) => {
      return await axiosApiInstance.delete(
        `/organizations/${org_id}/collections/${collection_id}/touch-points`,
        { data: { touch_point_ids } }
      )
    },
    onSuccess: (_data, touch_point_ids) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id, 'touch-points'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'touch-points'],
      })

      // Remove specific touch-point cache entries
      touch_point_ids.forEach((id) => {
        queryClient.removeQueries({
          queryKey: ['organizations', org_id, 'touch-points', id],
          exact: true,
        })
      })
    },
  })
}

/**
 * Add member to a collection
 */
export const useAddCollectionMember = (org_id: string, collection_id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AddCollectionMemberInput | BulkAddCollectionMembersInput) => {
      return await axiosApiInstance.post(
        `/organizations/${org_id}/collections/${collection_id}/members`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id, 'members'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id],
      })
    },
  })
}

/**
 * Update member role in a collection
 */
export const useUpdateCollectionMemberRole = (org_id: string, collection_id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ member_id, data }: { member_id: string; data: UpdateCollectionMemberInput }) => {
      return await axiosApiInstance.patch(
        `/organizations/${org_id}/collections/${collection_id}/members?member_id=${member_id}`,
        data
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id, 'members'],
      })
    },
  })
}

/**
 * Remove member from a collection
 */
export const useRemoveCollectionMember = (org_id: string, collection_id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (member_id: string) => {
      return await axiosApiInstance.delete(
        `/organizations/${org_id}/collections/${collection_id}/members?member_id=${member_id}`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id, 'members'],
      })
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections', collection_id],
      })
    },
  })
}

/**
 * Leave a collection (remove yourself)
 */
export const useLeaveCollection = (org_id: string, collection_id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await axiosApiInstance.post(
        `/organizations/${org_id}/collections/${collection_id}/leave`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', org_id, 'collections'],
      })
    },
  })
}
