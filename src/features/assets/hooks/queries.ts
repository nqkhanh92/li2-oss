'use client'
import { PaginationResponse, SearchFilterPagination } from '@/shared/types'
import { useQuery } from '@tanstack/react-query'
import { AssetColumn } from '@/features/assets/components/columns'
import { axiosApiInstance } from '@/shared/lib/axios'
import { useEffect, useState } from 'react'
import { DropdownData } from '@/app/api/organizations/[org_id]/dropdowns/[module]/route'

export const useGetAsset = (org_id: string, params: SearchFilterPagination) => {
  return useQuery<PaginationResponse<AssetColumn>>({
    queryKey: ['organizations', org_id, 'assets', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<AssetColumn>>(
        `/organizations/${org_id}/assets`,
        { params }
      )
      return data
    },
  })
}

export const useShowAsset = (org_id: string, asset_id: string) => {
  return useQuery<AssetColumn>({
    queryKey: ['organizations', org_id, 'assets', asset_id],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<AssetColumn>(
        `/organizations/${org_id}/assets/${asset_id}`
      )
      return data
    },
  })
}

export const useGetAssetDropdown = (org_id: string) => {
  return useQuery<DropdownData<'assets'>>({
    queryKey: ['organizations', org_id, 'dropdown', 'assets'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<DropdownData<'assets'>>(
        `/organizations/${org_id}/dropdowns/assets`
      )
      return data
    },
  })
}
