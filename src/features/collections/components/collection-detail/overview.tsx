'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Users, Link as LinkIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { CollectionOrgPermission, CollectionWithStats } from '@/shared/types/collection.types'
import { format } from 'date-fns'
import { useState } from 'react'
import { CollectionFormDialog } from '../forms/collection-form-dialog'
import { useDeleteCollection } from '../../hooks/mutations'
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
import { getOrgPermissionLabel } from '../../constants/collections'
import dayjs from '@/shared/lib/dayjs'

interface CollectionOverviewProps {
  collection: CollectionWithStats
}

export const CollectionOverview = ({ collection }: CollectionOverviewProps) => {
  const { t } = useTranslation(['collection', 'common'])
  const router = useRouter()
  const { org_id } = useParams<{ org_id: string }>()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const deleteMutation = useDeleteCollection(org_id)

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(collection.id)
    router.push(`/org/${org_id}/spaces`)
  }

  // const getPermissionLabel = (permission: string) => {
  //   switch (permission) {
  //     case 'can_edit':
  //       return t('collection:permissions.can_edit')
  //     case 'can_view':
  //       return t('collection:permissions.can_view')
  //     case 'no_access':
  //       return t('collection:permissions.no_access')
  //     default:
  //       return permission
  //   }
  // }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">
              <LinkIcon className="inline-block w-4 h-4 mr-2" />
              {t('collection:stats.touch_points')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collection.touch_points_count || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">
              <Users className="inline-block w-4 h-4 mr-2" />
              {t('collection:stats.members')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collection.members_count || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">
              {t('collection:stats.org_permission')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default">
              {getOrgPermissionLabel(collection.org_permission as CollectionOrgPermission)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Collection Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('collection:details.title')}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                {t('collection:details.edit_button')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('collection:details.delete_buttons')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-500">
              {t('collection:details.name')}
            </label>
            <p className="mt-1">{collection.name}</p>
          </div>

          {collection.description && (
            <div>
              <label className="text-sm font-medium text-slate-500">
                {t('collection:details.description')}
              </label>
              <p className="mt-1 text-slate-700">{collection.description}</p>
            </div>
          )}

          {collection.color && (
            <div>
              <label className="text-sm font-medium text-slate-500">
                {t('collection:details.color')}
              </label>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: collection.color }}
                />
                <span className="text-sm text-slate-600">{collection.color}</span>
              </div>
            </div>
          )}

          {collection.created_at && (
            <div>
              <label className="text-sm font-medium text-slate-500">
                {t('collection:details.created_at')}
              </label>
              <p className="mt-1 text-sm text-slate-700">
                {dayjs(collection.created_at).format('LL')}
              </p>
            </div>
          )}

          {collection.updated_at && (
            <div>
              <label className="text-sm font-medium text-slate-500">
                {t('collection:details.updated_at')}
              </label>
              <p className="mt-1 text-sm text-slate-700">
                {dayjs(collection.updated_at).format('LL')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <CollectionFormDialog
        mode="edit"
        collection={collection}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('collection:confirm_delete_dialog')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('collection:messages.delete_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('collection:deleting') : t('common:buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
