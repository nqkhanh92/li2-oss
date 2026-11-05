'use client'

import { useState, useRef } from 'react'
import { notFound, useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  FolderOpenIcon,
  Pencil,
  MoreHorizontal,
  Trash2,
  CalendarIcon,
  UserIcon,
  PenLine,
  BarChartIcon,
  ChartNoAxesCombined,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
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
import { CollectionOrgPermission, CollectionWithStats } from '@/shared/types/collection.types'
import { CollectionFormDialogV2 } from '../form-v2'
import { useDeleteCollection } from '../../hooks/mutations'
import dayjs from '@/shared/lib/dayjs'
import { useGetCollection } from '../../hooks/queries'
import { getPermissionConfig } from '../collections-list-v2'
import { useConfirmDialog } from '@/shared/components/customize/confirm-dialog'

interface CollectionDetailHeaderV2Props {
  collection: CollectionWithStats
  orgId: string
}

export const CollectionDetailHeaderV2 = ({
  collection: _collection,
  orgId,
}: CollectionDetailHeaderV2Props) => {
  const { t } = useTranslation(['collection', 'common'])
  const router = useRouter()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const isDeletedRef = useRef(false)

  const { mutateAsync, isPending } = useDeleteCollection(orgId)
  const { data } = useGetCollection(orgId, _collection.id)
  const { confirm } = useConfirmDialog()

  const collection = data?.data

  const handleDelete = async () => {
    confirm({
      title: t('collection:confirm_delete_dialog'),
      description: t('collection:messages.delete_warning'),
      onConfirm: async () => {
        isDeletedRef.current = true
        await mutateAsync(_collection.id)
        router.replace(`/org/${orgId}/spaces`)
      },
    })
  }

  if (isPending || isDeletedRef.current) return null
  if (!collection) return notFound()

  const iconColor = collection.color || '#2563EB'

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
      {/* Top row: Icon, Name, Badge, Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${iconColor}20` }}
          >
            <FolderOpenIcon className="w-4 h-4" style={{ color: iconColor }} />
          </div>

          <h1 className="text-lg font-semibold text-foreground">{collection.name}</h1>
          <Badge
            className={`shrink-0 px-2 py-1 text-xs ${
              getPermissionConfig(collection.org_permission as CollectionOrgPermission).bgColor
            } ${
              getPermissionConfig(collection.org_permission as CollectionOrgPermission).textColor
            }`}
          >
            {getPermissionConfig(collection.org_permission as CollectionOrgPermission).label}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              router.push(
                `/org/${orgId}/analytics?filters=${JSON.stringify({
                  collection_ids: [collection.id],
                })}`
              )
            }
            className="h-9 w-9"
            title="Analytics"
          >
            <ChartNoAxesCombined className="w-4.5 h-4.5 text-slate-700" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsEditDialogOpen(true)}
            className="h-9 w-9"
          >
            <PenLine className="w-4.5 h-4.5 text-slate-700" />
          </Button>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="w-4.5 h-4.5 text-slate-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('collection:details.delete_buttons')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bottom row: Meta info */}
      <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
        {collection.updated_at && (
          <div className="flex items-center gap-1">
            <Pencil className="w-3.5 h-3.5" />
            <span>{dayjs(collection.updated_at).format('DD/MM/YYYY')}</span>
          </div>
        )}
        {collection.created_at && (
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>{dayjs(collection.created_at).format('DD/MM/YYYY')}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <UserIcon className="w-3.5 h-3.5" />
          <span>{collection.creator?.email || 'Unknown'}</span>
        </div>
      </div>

      {/* Edit Dialog */}
      <CollectionFormDialogV2
        mode="edit"
        collection={collection}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  )
}
