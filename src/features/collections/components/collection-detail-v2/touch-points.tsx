'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import {
  Plus,
  Link as LinkIcon,
  ExternalLink,
  MoreVertical,
  Trash2,
  Copy,
  MoveRight,
  QrCode,
  SquareArrowOutUpRight,
} from 'lucide-react'
import { useGetCollectionTouchPoints } from '../../hooks/queries'
import { useRemoveTouchPointsFromCollection } from '../../hooks/mutations'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { AddTouchPointDialog } from '../collection-detail/add-touch-point-dialog'
import { toast } from 'sonner'
import { Typography } from '@/shared/components/ui/typography'

interface CollectionTouchPointsV2Props {
  collectionId: string
  orgId: string
}

export const CollectionTouchPointsV2 = ({ collectionId, orgId }: CollectionTouchPointsV2Props) => {
  const { t } = useTranslation(['collection', 'common', 'touchpoint'])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { data: response, isLoading } = useGetCollectionTouchPoints(orgId, collectionId)
  const removeMutation = useRemoveTouchPointsFromCollection(orgId, collectionId)

  const touchPoints = response?.data || []
  const count = response?.rowCount || 0

  const handleRemove = async (touchPointId: string) => {
    try {
      await removeMutation.mutateAsync([touchPointId])
    } catch (error) {
      console.error('Failed to remove touch-point:', error)
    }
  }

  const handleCopyShortUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success(t('common:messages.copied'))
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleSelectAll = () => {
    if (selectedIds.length === touchPoints.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(touchPoints.map((tp) => tp.id))
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-b-lg border border-t-0 border-slate-200 p-6 pt-10">
        <div className="mb-6">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-b-lg border border-t-0 border-slate-200 p-6 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Typography component="h2" size={'l'} weight={'semibold'} className="text-foreground p-0!">
          {t('collection:touch_points.title')}
        </Typography>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-[#000D27] hover:bg-[#000D27]/90"
          iconLeft={<Plus className="w-4 h-4" />}
        >
          {t('touchpoint:actions.create_link', { defaultValue: 'Create Link' })}
        </Button>
      </div>

      {/* Content */}
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4">
          <LinkIcon className="w-16 h-16 text-slate-400 mb-2" />
          <h3 className="text-base font-medium text-foreground mb-1">
            {t('collection:touch_points.empty_title')}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            {t('collection:touch_points.empty_description')}
          </p>
          <Button
            variant="outline"
            onClick={() => setIsAddDialogOpen(true)}
            className="border-slate-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('collection:touch_points.add_first')}
          </Button>
        </div>
      ) : (
        <div>
          <Table>
            <TableHeader className="border-t-0">
              <TableRow className="bg-background hover:bg-slate-50 border-0 border-b border-slate-200">
                <TableHead className="w-[18px]">
                  <Checkbox
                    checked={selectedIds.length === touchPoints.length && touchPoints.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-slate-500 font-medium pl-4">
                  {t('common:label.short_link', { defaultValue: 'Short Link' })}
                </TableHead>
                <TableHead className="text-right text-slate-500 font-medium">
                  {t('common:actions.actions', { defaultValue: 'Actions' })}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {touchPoints.map((tp) => (
                <TableRow
                  key={tp.id}
                  className="hover:bg-slate-50 border-0 border-b border-slate-200"
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(tp.id)}
                      onCheckedChange={() => handleToggleSelect(tp.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 items-center">
                      <div className="flex items-center justify-center p-1 bg-cyan-50 rounded w-6 h-6 mx-2">
                        {tp.content_type === 'QR_CODE' ? (
                          <QrCode className="w-4 h-4 text-cyan-600" />
                        ) : (
                          <LinkIcon className="w-4 h-4 text-cyan-600" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[15px] text-foreground truncate leading-[22px]">
                          {tp.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={tp.short_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[14px] font-medium text-[#437EF7] hover:underline leading-5"
                            >
                              {tp.short_url}
                            </a>
                            <button
                              onClick={() => handleCopyShortUrl(tp.short_url || '')}
                              className="p-1.5 rounded-full hover:bg-slate-100"
                            >
                              <Copy className="w-4 h-4 text-[#437EF7]" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <MoveRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-[14px] text-slate-500 truncate leading-5">
                              {tp.content_value || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/org/${orgId}/short-links/${tp.id}`}>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <SquareArrowOutUpRight className="w-4.5 h-4.5 text-semantic-info" />
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreVertical className="w-4.5 h-4.5 text-slate-700" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRemove(tp.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common:buttons.remove', { defaultValue: 'Remove' })}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination placeholder */}
          <div className="flex items-center justify-end gap-4 p-4 border-t border-slate-200 text-sm text-slate-500">
            <span>Row per page</span>
            <span>10</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      )}

      {/* Add Touch Point Dialog */}
      <AddTouchPointDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        collectionId={collectionId}
        orgId={orgId}
      />
    </div>
  )
}
