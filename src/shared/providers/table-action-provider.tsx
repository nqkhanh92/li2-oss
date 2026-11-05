import React, { createContext } from 'react'

type CustomAction = {
  name: 'view' | 'edit' | 'delete' | string
  label: string
  warnType?: 'dialog' | 'popover'
  warnTitle?: string
  warnDesc?: string
  // Rendered as a component (`<Icon />`) in DataTableRowActions, so this must be
  // a component type, not an element. Falls back to mappingIcon[name] when unset.
  icon?: React.ElementType
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  action?: (
    row: any,
    options?: { onSuccess?: () => void; onError?: () => void }
  ) => void | Promise<void>
  isLoading?: boolean
  render?: (row: any) => React.ReactNode
}

type TableActionProviderValue = {
  actions: CustomAction[] | undefined // customActions is optional
}

// Create context
export const TableActionContext = createContext<TableActionProviderValue | null>(null)

// Provider
export const TableActionProvider = ({
  actions,
  children,
}: {
  actions?: CustomAction[] // customActions is now optional
  children: React.ReactNode
}) => {
  return <TableActionContext.Provider value={{ actions }}>{children}</TableActionContext.Provider>
}
