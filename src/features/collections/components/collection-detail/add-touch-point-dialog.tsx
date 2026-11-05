'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { useGetTouchPoints } from '@/features/touch-points/hooks/queries'
import { useAddTouchPointsToCollection } from '../../hooks/mutations'
import { toast } from 'sonner'
import { Search, Link2, Loader2, UserRound, Calendar, FolderOpen } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import dayjs from '@/shared/lib/dayjs'

interface AddTouchPointDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId: string
  orgId: string
}

export const AddTouchPointDialog = ({
  open,
  onOpenChange,
  collectionId,
  orgId,
}: AddTouchPointDialogProps) => {
  const { t } = useTranslation(['collection', 'common', 'touchpoint'])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Fetch only editable touch-points excluding those already in this collection
  const { data: touchPointsResponse, isLoading } = useGetTouchPoints(
    orgId,
    {
      pagination: { pageIndex: 0, pageSize: 100 },
      search: '',
      sorting: [{ id: 'created_at', desc: true }],
      filters: {},
    },
    {
      editableOnly: true, // Only show touch-points user can edit
      excludeCollectionId: collectionId, // Exclude touch-points already in this collection
    }
  )

  const addMutation = useAddTouchPointsToCollection(orgId, collectionId)

  const touchPoints = touchPointsResponse?.data || []

  // Filter touch-points based on client-side search only
  // Backend already filtered for editable + excluded current collection
  // Exclude flagged links — they are frozen and cannot be moved
  const filteredTouchPoints = touchPoints.filter((tp) => {
    if (tp.safety_status === 'flagged') return false

    const matchesSearch =
      !search ||
      tp.name.toLowerCase().includes(search.toLowerCase()) ||
      tp.short_code?.toLowerCase().includes(search.toLowerCase())

    return matchesSearch
  })

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTouchPoints.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredTouchPoints.map((tp) => tp.id))
    }
  }

  const handleAdd = async () => {
    if (selectedIds.length === 0) {
      toast.error(t('collection:touch_points.select_at_least_one'))
      return
    }

    try {
      await addMutation.mutateAsync({ touch_point_ids: selectedIds })
      // Success toast is handled by global React Query handler
      setSelectedIds([])
      setSearch('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to add touch-points:', error)
      // Error toast is handled by global React Query error handler
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('collection:touch_points.add_dialog_title')}</DialogTitle>
          <DialogDescription>
            {t('collection:touch_points.add_dialog_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 w-full overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('collection:touch_points.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select All */}
          {filteredTouchPoints.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={
                  selectedIds.length === filteredTouchPoints.length &&
                  filteredTouchPoints.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-muted-foreground">
                {t('collection:touch_points.select_all')} ({selectedIds.length} /{' '}
                {filteredTouchPoints.length})
              </span>
            </div>
          )}

          {/* Touch Points List */}
          <ScrollArea className="h-[400px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTouchPoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Link2 className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {search
                    ? t('collection:touch_points.no_results')
                    : t('collection:touch_points.all_added')}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredTouchPoints.map((tp) => (
                  <div
                    key={tp.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleToggle(tp.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(tp.id)}
                      onCheckedChange={() => handleToggle(tp.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate max-w-72">{tp.name}</span>
                        {tp.content_type && (
                          <Badge variant="outline" className="text-xs">
                            {tp.content_type && tp.content_type === 'URL' ? 'LINK' : 'QR'}
                            {!tp.content_type && 'LINK'}
                          </Badge>
                        )}
                        {tp.collections && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">{tp.collections.name}</span>
                          </Badge>
                        )}
                      </div>
                      {tp.short_url && (
                        <p className="text-xs text-muted-foreground truncate">{tp.short_url}</p>
                      )}
                      <div className="flex gap-3 items-center text-xs text-muted-foreground mt-1">
                        <div className="flex gap-1 items-center">
                          <UserRound className="w-3 h-3" />
                          <span className="truncate">{tp.profiles?.email || 'User'}</span>
                        </div>
                        <div className="flex gap-1 items-center shrink-0">
                          <Calendar className="w-3 h-3" />
                          <span>{dayjs(tp.created_at).format('MMM DD, YYYY')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="space-x-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:buttons.cancel')}
          </Button>
          <Button onClick={handleAdd} disabled={selectedIds.length === 0 || addMutation.isPending}>
            {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('common:buttons.add')} {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
