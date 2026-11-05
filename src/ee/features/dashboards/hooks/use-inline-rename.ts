import { useState, useCallback, useRef } from 'react'

interface UseInlineRenameOptions {
  currentName: string
  onSubmit: (name: string) => void
}

export function useInlineRename({ currentName, onSubmit }: UseInlineRenameOptions) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const pendingRenameRef = useRef(false)

  const handleRename = () => {
    setRenameValue(currentName)
    setIsRenaming(true)
    pendingRenameRef.current = true
  }

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue.trim() !== currentName) {
      onSubmit(renameValue.trim())
    }
    setIsRenaming(false)
  }

  // Prevent Radix DropdownMenu from restoring focus to the trigger when
  // rename was just triggered. Pass this to <DropdownMenuContent onCloseAutoFocus>.
  const handleCloseAutoFocus = useCallback((e: Event) => {
    if (pendingRenameRef.current) {
      e.preventDefault()
      pendingRenameRef.current = false
    }
  }, [])

  // Ref callback to focus + select the input once it mounts.
  // setTimeout defers past Radix's DismissableLayer cleanup which uses rAF internally.
  const renameInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      setTimeout(() => {
        node.focus()
        node.select()
      }, 0)
    }
  }, [])

  return { isRenaming, setIsRenaming, renameValue, setRenameValue, handleRename, handleRenameSubmit, renameInputRef, handleCloseAutoFocus }
}
