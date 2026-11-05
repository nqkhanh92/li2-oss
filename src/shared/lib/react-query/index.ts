import { toast } from '@/shared/hooks/use-toast'
import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { t } from 'i18next'
import { isPlanGateError } from '@/shared/lib/axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onSettled: (res: any) => {
        const data = res?.data
        if (data && data.success === true) {
          let message = data?.message

          if (data?.i18nMessage?.key) {
            message = t(data?.i18nMessage?.key, data?.i18nMessage?.params, {
              defaultValue: data?.i18nMessage?.defaultMessage,
            })
          }

          toast({
            title: message ?? 'Action successful',
            variant: 'success',
          })
        }
      },
      onError: (error: any) => {
        const response = error?.response?.data
        let message = response?.message ?? error?.message

        if (response?.i18nMessage?.key) {
          message = t(response?.i18nMessage?.key, response?.i18nMessage?.params, {
            defaultValue: response?.i18nMessage?.defaultMessage,
          })
        }
        toast({
          title: t('common:messages.error.some_error'),
          description: message,
          variant: 'destructive',
        })
      },
    },
    queries: {
      retry(failureCount, error) {
        if (isAxiosError(error) && error.response?.status === 403) {
          if (!isPlanGateError(error)) {
            const i18nMsg = error.response?.data?.i18nMessage
            const message = i18nMsg?.key
              ? t(i18nMsg.key, i18nMsg.params, { defaultValue: i18nMsg.defaultMessage })
              : error.response?.data?.message ||
                error.response?.data?.error ||
                error?.message ||
                'Unknown error'
            toast({
              id: `query-forbidden:${i18nMsg?.key ?? 'unknown'}`,
              title: t('common:messages.error.some_error'),
              description: message,
              variant: 'destructive',
            })
          }
          return false
        }
        return failureCount < 3
      },
    },
  },
})
