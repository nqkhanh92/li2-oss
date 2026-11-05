'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import {
  useAddTouchPointsToCollection,
  useRemoveTouchPointsFromCollection,
} from '@/features/collections/hooks/mutations'
import { CollectionFormDialog } from '@/features/collections/components/forms/collection-form-dialog'
import { toast } from 'sonner'
import { FolderOpen, Loader2, FolderX, Search, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { AxiosError } from 'axios'
import { APIResponse } from '@/shared/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface MoveToCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  touchPointIds: string[]
  currentCollectionId?: string | null
  orgId: string
  onSuccess?: () => void
}

export const MoveToCollectionDialog = ({
  open,
  onOpenChange,
  touchPointIds,
  currentCollectionId,
  orgId,
  onSuccess,
}: MoveToCollectionDialogProps) => {
  const { t } = useTranslation(['touchpoint', 'common', 'collection'])
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [optimisticCollectionId, setOptimisticCollectionId] = useState<string | null | undefined>(undefined)
  const [newlyCreatedCollectionId, setNewlyCreatedCollectionId] = useState<string | null>(null)
  const [pendingMoveData, setPendingMoveData] = useState<{
    fromCollectionName?: string
    toCollectionName: string
    toCollectionId: string
  } | null>(null)

  const { data: collectionsResponse, isLoading } = useGetCollectionsDropdown(orgId, true)
  const collections = collectionsResponse?.data || []
  const previousCollectionIdsRef = useRef<Set<string>>(new Set())

  // Filtered collections based on search, with newly created collection at the top
  const filteredCollections = useMemo(() => {
    let filtered = collections

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = collections.filter((collection) =>
        collection.name.toLowerCase().includes(query)
      )
    }

    // Sort to put newly created collection at the top
    if (newlyCreatedCollectionId) {
      return [
        ...filtered.filter((c) => c.id === newlyCreatedCollectionId),
        ...filtered.filter((c) => c.id !== newlyCreatedCollectionId),
      ]
    }

    return filtered
  }, [collections, searchQuery, newlyCreatedCollectionId])

  // We need to create mutation hooks conditionally
  // For add: only if selectedCollectionId is a string
  // For remove: only if currentCollectionId exists
  const addMutation = useAddTouchPointsToCollection(
    orgId,
    selectedCollectionId || '' // Will only be used when selectedCollectionId is a string
  )
  const removeMutation = useRemoveTouchPointsFromCollection(
    orgId,
    currentCollectionId || '' // Will only be used when currentCollectionId exists
  )

  const isMoving = addMutation.isPending || removeMutation.isPending

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedCollectionId(undefined)
      setSearchQuery('')
      setNewlyCreatedCollectionId(null)
    }
  }, [open])

  // Detect when a new collection is created and auto-select it
  useEffect(() => {
    if (showCreateDialog) {
      // Store the current collection IDs when create dialog opens
      previousCollectionIdsRef.current = new Set(collections.map((c) => c.id))
    } else if (previousCollectionIdsRef.current.size > 0 && previousCollectionIdsRef.current.size < collections.length) {
      // A new collection was added - find it by comparing IDs
      const newCollection = collections.find((c) => !previousCollectionIdsRef.current.has(c.id))

      if (newCollection) {
        setNewlyCreatedCollectionId(newCollection.id)
        setSelectedCollectionId(newCollection.id)
        // Reset the tracking set
        previousCollectionIdsRef.current = new Set()
      }
    }
  }, [collections, showCreateDialog])

  // Helper function to parse error messages
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof AxiosError) {
      const apiResponse = error.response?.data as APIResponse<unknown> | undefined

      // Check for specific error codes
      if (error.response?.status === 403) {
        return t('common:messages.error.permission_denied')
      }
      if (error.response?.status === 404) {
        return t('common:messages.error.not_found')
      }

      // Use API error message if available
      if (apiResponse?.message) {
        return apiResponse.message
      }
    }

    return t('common:messages.error.generic')
  }

  const handleMoveClick = () => {
    if (touchPointIds.length === 0) {
      toast.error(t('touchpoint:messages.no_touch_points_selected'))
      return
    }

    // If moving between collections, show confirmation
    if (currentCollectionId && selectedCollectionId && selectedCollectionId !== null) {
      const currentCollection = collections.find((c) => c.id === currentCollectionId)
      const targetCollection = collections.find((c) => c.id === selectedCollectionId)

      if (targetCollection) {
        setPendingMoveData({
          fromCollectionName: currentCollection?.name,
          toCollectionName: targetCollection.name,
          toCollectionId: selectedCollectionId,
        })
        setShowConfirmDialog(true)
        return
      }
    }

    // Otherwise, proceed directly
    handleMove()
  }

  const handleMove = async () => {
    // Set optimistic state immediately
    setOptimisticCollectionId(selectedCollectionId)

    try {
      // Case 1: Remove from collection (selectedCollectionId is null)
      if (selectedCollectionId === null) {
        if (!currentCollectionId) {
          // Nothing to do - can't remove from a collection if not in one
          return
        }
                
        await removeMutation.mutateAsync(touchPointIds)

        toast.success(
          touchPointIds.length === 1
            ? t('touchpoint:messages.removed_from_collection')
            : t('touchpoint:messages.removed_from_collection_bulk', { count: touchPointIds.length })
        )
      }
      // Case 2: Move to a different collection
      else if (selectedCollectionId) {
        // Backend handles the move atomically - just call addMutation
        // It will check both SOURCE and TARGET permissions before moving
        // No need to call removeMutation separately (which could orphan TPs if add fails)
        await addMutation.mutateAsync({ touch_point_ids: touchPointIds })

        toast.success(
          touchPointIds.length === 1
            ? t('touchpoint:messages.moved_to_collection')
            : t('touchpoint:messages.moved_to_collection_bulk', { count: touchPointIds.length })
        )
      }

      onSuccess?.()
      onOpenChange(false)
      setShowConfirmDialog(false)
      setPendingMoveData(null)
      setOptimisticCollectionId(undefined)
    } catch (error) {
      console.error('Failed to move touch-points:', error)
      // Note: Global onError handler in react-query already shows the toast
      // Rollback optimistic update on error
      setOptimisticCollectionId(undefined)
    }
  }

  const handleCreateSuccess = () => {
    setShowCreateDialog(false)
    // After creation, the collection will appear in the list due to query invalidation
  }

  const isRemoveFromCollection = selectedCollectionId === null && currentCollectionId

  return (
    <>
      <CustomDialogV2
        open={open}
        onOpenChange={onOpenChange}
        size="sm"
        title={
          touchPointIds.length === 1
            ? t('touchpoint:move_to_collection.title_single', 'Move Touch Point')
            : t('touchpoint:move_to_collection.title_multiple', 'Move {{count}} Touch Points', {
              count: touchPointIds.length,
            })
        }
        description={
          currentCollectionId
            ? t(
              'touchpoint:move_to_collection.description_with_current',
              'Select a new collection or remove from current collection'
            )
            : t(
              'touchpoint:move_to_collection.description',
              'Select a collection to organize your touch points'
            )
        }
      >

        <div className="space-y-4">
          {/* Remove from Collection Option */}
          {currentCollectionId && (
            <button
              onClick={() => setSelectedCollectionId(null)}
              aria-label={t('touchpoint:move_to_collection.remove_from_collection', 'Remove from Collection')}
              aria-pressed={selectedCollectionId === null}
              className={cn(
                'w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                selectedCollectionId === null
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <FolderX className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {t('touchpoint:move_to_collection.remove_from_collection', 'Remove from Collection')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'touchpoint:move_to_collection.uncategorized',
                    'Touch point will be uncategorized'
                  )}
                </p>
              </div>
            </button>
          )}

          {/* Collections List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="text-sm font-medium text-muted-foreground">
                {t('collection:select_collection')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                {t('common:buttons.create_new')}
              </Button>
            </div>

            {/* Search Input */}
            {collections.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('collection:search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  aria-label={t('collection:search_placeholder')}
                />
              </div>
            )}

            <ScrollArea className="h-[300px] border rounded-md">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <FolderOpen className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    {t('collection:no_collections')}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t('collection:no_collections_description')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('collection:form.create_button')}
                  </Button>
                </div>
              ) : filteredCollections.filter((c) => c.id !== currentCollectionId).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? t('collection:no_results')
                      : t('collection:all_in_current')}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1" role="listbox" aria-label={t('collection:available_collections')}>
                  {filteredCollections
                    .filter((c) => c.id !== currentCollectionId) // Don't show current collection
                    .map((collection, index) => (
                      <button
                        key={collection.id}
                        onClick={() => setSelectedCollectionId(collection.id)}
                        role="option"
                        aria-selected={selectedCollectionId === collection.id}
                        aria-label={`${collection.name}`}
                        tabIndex={index === 0 ? 0 : -1}
                        disabled={optimisticCollectionId === collection.id && isMoving}
                        onKeyDown={(e) => {
                          const buttons = e.currentTarget.parentElement?.querySelectorAll('button')
                          if (!buttons) return

                          const currentIndex = Array.from(buttons).indexOf(e.currentTarget)

                          if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            const nextButton = buttons[currentIndex + 1] as HTMLButtonElement | undefined
                            nextButton?.focus()
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            const prevButton = buttons[currentIndex - 1] as HTMLButtonElement | undefined
                            prevButton?.focus()
                          } else if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedCollectionId(collection.id)
                          }
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                          selectedCollectionId === collection.id
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:bg-accent',
                          optimisticCollectionId === collection.id && isMoving && 'opacity-60'
                        )}
                      >
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-lg"
                          style={{
                            backgroundColor: collection.color
                              ? `${collection.color}20`
                              : 'hsl(var(--muted))',
                          }}
                        >
                          <FolderOpen
                            className="w-5 h-5"
                            style={{
                              color: collection.color || 'hsl(var(--muted-foreground))',
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate block">
                              {collection.name}
                            </span>
                            {optimisticCollectionId === collection.id && isMoving && (
                              <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                            )}
                          </div>
                          {collection.touch_points_count !== undefined && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>
                                {collection.touch_points_count}{' '}
                                {t('common:module.touch_point')}
                              </span>
                              {collection.updated_at && (
                                <>
                                  <span>•</span>
                                  <span>{dayjs(collection.updated_at).fromNow()}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleMoveClick} disabled={selectedCollectionId === undefined || isMoving}>
            {isMoving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isRemoveFromCollection
              ? t('common:buttons.remove')
              : currentCollectionId
                ? t('common:buttons.move')
                : t('common:buttons.add')}
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('touchpoint:move_to_collection.confirm_title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingMoveData && (
                  <>
                    {pendingMoveData.fromCollectionName ? (
                      t(
                        'touchpoint:move_to_collection.confirm_description_with_source',
                        {
                          count: touchPointIds.length,
                          from: pendingMoveData.fromCollectionName,
                          to: pendingMoveData.toCollectionName,
                        }
                      )
                    ) : (
                      t(
                        'touchpoint:move_to_collection.confirm_description',
                        {
                          count: touchPointIds.length,
                          to: pendingMoveData.toCollectionName,
                        }
                      )
                    )}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common:buttons.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleMove}>
                {t('common:buttons.move')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CustomDialogV2>

      {/* Create Collection Dialog */}
      <CollectionFormDialog
        mode="create"
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) {
            handleCreateSuccess()
          }
        }}
        modal={true}
      />
    </>
  )
}
