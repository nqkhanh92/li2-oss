'use client'
import React, { ReactNode, useCallback, useContext, useEffect } from 'react'
import { useNavigationGuard } from 'next-navigation-guard'
import { create } from 'zustand'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useConfirmDialog } from '../components/customize/confirm-dialog'
interface FormWarningProviderValue {
  accept: () => void
  reject: () => void
  active: boolean
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  back: () => void
  push: (to: string) => void
  replace: (to: string) => void
  showConfirm: () => Promise<boolean>
}
const Context = React.createContext<FormWarningProviderValue | null>(null)
export const FormWarningProvider = ({ children }: { children: ReactNode }) => {
  const [enabled, setEnabled] = React.useState(false)
  const router = useRouter()
  const { confirm } = useConfirmDialog()
  const { t } = useTranslation()

  const showConfirm = () => {
    return confirm({
      title: t('common:messages.leave_without_saving_title'),
      description: t('common:messages.leave_without_saving_description'),
      confirmButtonText: t('common:buttons.leave_without_saving'),
      cancelButtonText: t('common:buttons.stay_on_page'),
      onConfirm: () => setEnabled(false),
      onCancel: () => {},
    })
  }
  const { accept, reject, active } = useNavigationGuard({
    enabled,
    confirm: ({ type, to }) => {
      return showConfirm()
    },
  })
  const pathname = usePathname()
  useEffect(() => {
    setEnabled(false)
  }, [pathname])

  const back = useCallback(async () => {
    if (!enabled) {
      router.back()
      return
    }
    const result = await showConfirm()
    if (result) {
      router.back()
      return
    }
  }, [enabled, router])
  const push = useCallback(
    async (to: string) => {
      if (!enabled) {
        router.push(to)
        return
      }
      const result = await showConfirm()
      if (result) {
        router.push(to)
        return
      }
    },
    [enabled, router]
  )
  const replace = useCallback(
    async (to: string) => {
      if (!enabled) {
        router.replace(to)
        return
      }
      const result = await showConfirm()
      if (result) {
        router.replace(to)
        return
      }
    },
    [enabled, router]
  )

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (enabled) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave this page?'
      }
    }
    // const handlePopstate = () => {
    //   const confirmLeave = window.confirm("warningText");
    //   if (confirmLeave) {
    //     // User confirmed leaving, allow it by going back twice
    //     history.go(-2);
    //   } else {
    //     // User wants to stay, push state again to prevent leaving
    //     history.pushState(null, "", location.href);
    //   }
    // };
    window.addEventListener('beforeunload', handleBeforeUnload)
    // window.addEventListener("popstate", handlePopstate);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // window.removeEventListener("popstate", handlePopstate);
    }
  }, [enabled])

  const useStore = React.useMemo(() => {
    return create<FormWarningProviderValue>((set) => ({
      accept,
      reject,
      active,
      enabled,
      setEnabled,
      back,
      push,
      replace,
      showConfirm,
    }))
  }, [accept, reject, active, enabled])
  const store = useStore()
  return (
    <Context.Provider value={store}>
      {/* <DialogWarning /> */}
      {children}
    </Context.Provider>
  )
}

export const useFormWarningProvider = (): FormWarningProviderValue => {
  const ctx = React.useContext(Context)
  if (!ctx) throw Error(`Lack of provider`)
  return ctx
}
