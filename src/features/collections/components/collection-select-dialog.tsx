'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import CustomDialogV2 from '@/shared/components/customize/custom-dialog-v2'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { useGetCollectionsDropdown } from '@/features/collections/hooks/queries'
import { CollectionFormDialog } from './forms/collection-form-dialog'
import { FolderOpen, FolderX, Loader2, Plus, Search } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface CollectionSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with selected collection id, or null to remove from collection */
  onSelect: (id: string | null) => void
  currentCollectionId?: string | null
  orgId: string
}

export const CollectionSelectDialog = ({
  open,
  onOpenChange,
  onSelect,
  currentCollectionId,
  orgId,
}: CollectionSelectDialogProps) => {
  const { t } = useTranslation(['common', 'touchpoint', 'collection'])
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newlyCreatedCollectionId, setNewlyCreatedCollectionId] = useState<string | null>(null)
  const previousCollectionIdsRef = useRef<Set<string>>(new Set())

  const { data: collectionsResponse, isLoading } = useGetCollectionsDropdown(orgId)
  const collections = collectionsResponse?.data || []

  const filteredCollections = useMemo(() => {
    let filtered = collections
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = collections.filter((c) => c.name.toLowerCase().includes(q))
    }
    if (newlyCreatedCollectionId) {
      return [
        ...filtered.filter((c) => c.id === newlyCreatedCollectionId),
        ...filtered.filter((c) => c.id !== newlyCreatedCollectionId),
      ]
    }
    return filtered
  }, [collections, searchQuery, newlyCreatedCollectionId])

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setNewlyCreatedCollectionId(null)
    }
  }, [open])

  // Auto-select newly created collection
  useEffect(() => {
    if (showCreateDialog) {
      previousCollectionIdsRef.current = new Set(collections.map((c) => c.id))
    } else if (previousCollectionIdsRef.current.size > 0 && previousCollectionIdsRef.current.size < collections.length) {
      const newCollection = collections.find((c) => !previousCollectionIdsRef.current.has(c.id))
      if (newCollection) {
        setNewlyCreatedCollectionId(newCollection.id)
        previousCollectionIdsRef.current = new Set()
      }
    }
  }, [collections, showCreateDialog])

  const handleSelect = (id: string | null) => {
    onSelect(id)
    onOpenChange(false)
  }

  return (
    <>
      <CustomDialogV2
        open={open}
        onOpenChange={onOpenChange}
        size="sm"
        title={t('collection:select_collection')}
        description={t('touchpoint:move_to_collection.description')}
      >
        <div className="space-y-4">
          {/* Remove option */}
          {currentCollectionId && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                'border-border hover:border-muted-foreground/30'
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
                  {t('touchpoint:move_to_collection.uncategorized', 'Touch point will be uncategorized')}
                </p>
              </div>
            </button>
          )}

          {/* Collections list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="text-sm font-medium text-muted-foreground">
                {t('collection:select_collection')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowCreateDialog(true)}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                {t('common:buttons.create_new')}
              </Button>
            </div>

            {collections.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('collection:search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
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
                    type="button"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('collection:form.create_button')}
                  </Button>
                </div>
              ) : filteredCollections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t('collection:no_results')}</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCollections.map((collection) => (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => handleSelect(collection.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                        currentCollectionId === collection.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:bg-accent'
                      )}
                    >
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-lg"
                        style={{
                          backgroundColor: collection.color ? `${collection.color}20` : 'hsl(var(--muted))',
                        }}
                      >
                        <FolderOpen
                          className="w-5 h-5"
                          style={{ color: collection.color || 'hsl(var(--muted-foreground))' }}
                        />
                      </div>
                      <span className="font-medium text-sm truncate">{collection.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            {t('common:buttons.cancel')}
          </Button>
        </div>
      </CustomDialogV2>

      <CollectionFormDialog
        mode="create"
        open={showCreateDialog}
        onOpenChange={(open) => setShowCreateDialog(open)}
        modal={true}
      />
    </>
  )
}
