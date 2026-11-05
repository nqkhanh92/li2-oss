'use client'
import { Button } from '@/shared/components/ui/button'
import React, { useState, useCallback, createContext, useContext, useTransition } from 'react'
import { LoadingButton } from './loading-button'
import CustomDialogV2 from './custom-dialog-v2'

type ConfirmDialogOptions = {
  title?: string | React.ReactNode
  description?: string | React.ReactNode
  confirmButtonText?: string
  cancelButtonText?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  headerClassName?: string
  onConfirm?: () => Promise<void> | void
  onCancel?: () => void
}

type ConfirmDialogState = ConfirmDialogOptions & {
  isOpen: boolean
  resolve: ((value: boolean) => void) | null
}

type ConfirmDialogContextType = {
  confirm: (options?: ConfirmDialogOptions) => Promise<boolean>
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null)

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    resolve: null,
    title: 'Confirm Action',
    description: 'Are you sure you want to continue?',
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    size: 'xs',
  })

  const confirm = useCallback((options?: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        resolve,
        title: options?.title ?? 'Confirm Action',
        description: options?.description ?? 'Are you sure you want to continue?',
        confirmButtonText: options?.confirmButtonText ?? 'Confirm',
        cancelButtonText: options?.cancelButtonText ?? 'Cancel',
        size: options?.size ?? 'xs',
        headerClassName: options?.headerClassName,
        onConfirm: options?.onConfirm,
        onCancel: options?.onCancel,
      })
    })
  }, [])

  const [isLoading, startLoading] = useTransition()

  const handleConfirm = useCallback(async () => {
    if (state.resolve) {
      state.resolve(true)
      startLoading(async () => {
        await state.onConfirm?.()
        setState((prev) => ({ ...prev, isOpen: false, resolve: null }))
      })
    } else {
      setState((prev) => ({ ...prev, isOpen: false, resolve: null }))
    }
  }, [state])

  const handleCancel = useCallback(() => {
    if (state.resolve) {
      state.resolve(false)
      state.onCancel?.()
    }
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }))
  }, [state])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && state.resolve) {
        state.resolve(false)
      }
      setState((prev) => ({ ...prev, isOpen: open, resolve: open ? prev.resolve : null }))
    },
    [state.resolve]
  )

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <CustomDialogV2
        open={state.isOpen}
        setOpen={(open) => handleOpenChange(open)}
        onOpenChange={handleOpenChange}
        title={state.title}
        size={state.size ?? 'xs'}
      >
        <div className="flex flex-col gap-4">
          {state.description && <p className="text-s text-slate-500">{state.description}</p>}
          <div className="flex justify-end gap-4">
            <Button variant="secondary" onClick={handleCancel} className="text-slate-600">
              {state.cancelButtonText}
            </Button>
            <LoadingButton onClick={handleConfirm} variant="destructive" isLoading={isLoading}>
              {state.confirmButtonText}
            </LoadingButton>
          </div>
        </div>
      </CustomDialogV2>
    </ConfirmDialogContext.Provider>
  )
}

export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider')
  }
  return context
}
