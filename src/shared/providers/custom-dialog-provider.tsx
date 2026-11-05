import React, { createContext } from 'react'

export const CustomDialogContext = createContext<{
  openDialog: () => void
  closeDialog: () => void
} | null>(null)

type ProviderProps = {
  children: React.ReactNode
  open?: boolean
  setOpen?: (open: boolean) => void
}
export const CustomDialogProvider = ({ children, open, setOpen }: ProviderProps) => {
  return (
    <CustomDialogContext.Provider
      value={{
        openDialog: () => setOpen?.(true),
        closeDialog: () => setOpen?.(false),
      }}
    >
      {children}
    </CustomDialogContext.Provider>
  )
}

export const useCustomDialog = () => {
  const ctx = React.useContext(CustomDialogContext)
  if (!ctx) throw Error(`Lack of provider`)
  return ctx
}
