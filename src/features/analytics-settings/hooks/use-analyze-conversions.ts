'use client'

import { axiosApiInstance } from '@/shared/lib/axios'
import { useMutation } from '@tanstack/react-query'
import type { ConversionAnalysisResult } from '@/infrastructure/external/claude/claude.types'

export const useAnalyzeConversions = (org_id: string) => {
  return useMutation({
    mutationFn: async ({ url, locale }: { url: string; locale?: 'en' | 'vi' }) => {
      const { data } = await axiosApiInstance.post<{ data: ConversionAnalysisResult }>(
        `/organizations/${org_id}/smart-setup/analyze-conversions`,
        { url, locale: locale ?? 'en' }
      )
      return data.data
    },
  })
}
