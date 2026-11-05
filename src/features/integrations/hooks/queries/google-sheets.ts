import { useQuery } from '@tanstack/react-query'
import { axiosApiInstance } from '@/shared/lib/axios'
import { APIResponse } from '@/shared/types'
import { GoogleSpreadSheet, GoogleSheet } from '@/core/types/integration.type'

export const useGetSpreadsheets = (org_id: string, integration_id?: string) => {
  return useQuery({
    queryKey: ['organizations', org_id, 'integrations', integration_id, 'spreadsheets'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<GoogleSpreadSheet[]>>(
        `/organizations/${org_id}/integrations/${integration_id}/spreadsheets`
      )
      return data.data
    },
    enabled: !!integration_id,
  })
}

export const useGetSheetValues = (
  org_id: string,
  integration_id?: string,
  spreadsheet_id?: string
) => {
  return useQuery({
    queryKey: [
      'organizations',
      org_id,
      'integrations',
      integration_id,
      'spreadsheets',
      spreadsheet_id,
    ],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<GoogleSheet[]>>(
        `/organizations/${org_id}/integrations/${integration_id}/spreadsheets/${spreadsheet_id}`
      )
      return data.data
    },
    enabled: !!integration_id && !!spreadsheet_id,
  })
}

export const useGetSheetHeaders = (
  org_id: string,
  integration_id?: string,
  spreadsheet_id?: string,
  sheet_id?: string
) => {
  return useQuery({
    queryKey: [
      'organizations',
      org_id,
      'integrations',
      integration_id,
      'spreadsheets',
      spreadsheet_id,
      'sheets',
      sheet_id,
    ],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<string[]>>(
        `/organizations/${org_id}/integrations/${integration_id}/spreadsheets/${spreadsheet_id}/sheets/${sheet_id}`
      )
      return data.data
    },
    enabled: !!integration_id && !!spreadsheet_id && sheet_id !== undefined,
  })
}
