import { axiosApiInstance } from '@/shared/lib/axios'
import { useQuery } from '@tanstack/react-query'
import { SessionRecordingListResponse, SessionReplayResponse } from '../types'
import { SearchFilterPagination } from '@/shared/types'

export const useGetSessionRecordings = (orgId: string, params: SearchFilterPagination) => {
  return useQuery<SessionRecordingListResponse>({
    queryKey: ['organizations', orgId, 'session-recordings', params],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<SessionRecordingListResponse>(
        `/organizations/${orgId}/session-recordings`,
        { params }
      )
      return data
    },
    enabled: !!orgId,
  })
}

export const useGetSessionReplay = (orgId: string, sessionId: string) => {
  return useQuery<SessionReplayResponse>({
    queryKey: ['organizations', orgId, 'session-recordings', sessionId, 'replay'],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<SessionReplayResponse>(
        `/organizations/${orgId}/session-recordings/${sessionId}`
      )
      return data
    },
    enabled: !!orgId && !!sessionId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
