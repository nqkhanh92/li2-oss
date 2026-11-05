import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse, PaginationResponse, SearchFilterPagination } from '@/shared/types'
import { GetTagObject, Tag } from '@/app/api/organizations/[org_id]/tags/route'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'

export const useShowTag = (org_id: string, tagId: string) => {
  return useQuery<Tag>({
    queryKey: ['organizations', org_id, 'tag-details', tagId],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<Tag>>(
        `/organizations/${org_id}/tags/${tagId}`
      )
      return data.data
    },
  })
}

export const useGetTags = (org_id: string, params: SearchFilterPagination) => {
  return useQuery<PaginationResponse<GetTagObject>>({
    queryKey: ['organizations', org_id, 'tags', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<GetTagObject>>(
        `/organizations/${org_id}/tags`,
        { params }
      )
      return data
    },
  })
}

export const useGetTagDropdowns = (org_id: string) => {
  return useQuery<DropdownData<'tags'>>({
    queryKey: ['organizations', org_id, 'tags', 'dropdown'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<DropdownData<'tags'>>(
        `/organizations/${org_id}/dropdowns/tags`
      )
      return data
    },
    refetchOnWindowFocus: false,
  })
}
