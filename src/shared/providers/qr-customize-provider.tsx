'use client'

import {
  Dispatch,
  SetStateAction,
  createContext,
  useState,
  useContext,
  useCallback,
  useMemo,
} from 'react'
import { QrOptions } from '../constants/utils'
import equal from 'fast-deep-equal'
import { QR_CUSTOMIZE_DEFAULT_OPTIONS } from '@/features/touch-points/constants'

type TQrContext = {
  qrOptions: QrOptions
  setQrOptions: Dispatch<SetStateAction<QrOptions>>
  reset: () => void
  isDirty: boolean
}

export const QrContext = createContext<TQrContext>({
  qrOptions: QR_CUSTOMIZE_DEFAULT_OPTIONS,
  setQrOptions: () => {},
  reset: () => {},
  isDirty: false,
})

export function useQrContext() {
  return useContext(QrContext)
}

export default function QrCustomizeProvider({
  children,
  initialValues,
}: {
  children: React.ReactNode
  initialValues?: QrOptions
}) {
  const [qrOptions, setQrOptions] = useState<QrOptions>(
    initialValues ?? QR_CUSTOMIZE_DEFAULT_OPTIONS
  )
  const reset = useCallback(() => {
    setQrOptions(initialValues ?? QR_CUSTOMIZE_DEFAULT_OPTIONS)
  }, [initialValues])
  const isDirty = useMemo(() => {
    return !equal(qrOptions, initialValues ?? QR_CUSTOMIZE_DEFAULT_OPTIONS)
  }, [qrOptions, initialValues])

  return (
    <QrContext.Provider
      value={{
        qrOptions,
        setQrOptions,
        reset,
        isDirty,
      }}
    >
      {children}
    </QrContext.Provider>
  )
}
