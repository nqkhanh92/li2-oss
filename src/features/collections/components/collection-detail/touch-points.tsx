'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Plus, Link as LinkIcon, ExternalLink, Trash2 } from 'lucide-react'
import { useGetCollectionTouchPoints } from '../../hooks/queries'
import { useRemoveTouchPointsFromCollection } from '../../hooks/mutations'
import Link from 'next/link'
import { Badge } from '@/shared/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { AddTouchPointDialog } from './add-touch-point-dialog'
import { toast } from 'sonner'

interface CollectionTouchPointsProps {
  collectionId: string
  orgId: string
}

export const CollectionTouchPoints = ({ collectionId, orgId }: CollectionTouchPointsProps) => {
  const { t } = useTranslation(['collection', 'common', 'touchpoint'])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { data: response, isLoading } = useGetCollectionTouchPoints(orgId, collectionId)
  const removeMutation = useRemoveTouchPointsFromCollection(orgId, collectionId)

  const touchPoints = response?.data || []
  const count = response?.rowCount || 0

  const handleRemove = async (touchPointId: string) => {
    try {
      await removeMutation.mutateAsync([touchPointId])
      // Success toast is handled by global React Query handler
    } catch (error) {
      console.error('Failed to remove touch-point:', error)
      // Error toast is handled by global React Query error handler
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('collection:touch_points.title')}</CardTitle>
          <CardDescription>{t('collection:touch_points.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('collection:touch_points.title')}</CardTitle>
            {count === 0 ? (
              <CardDescription>{t('collection:touch_points.description')}</CardDescription>
            ) : (
              <CardDescription>
                {count}{' '}
                {count === 1 ? 'link' : 'links'}{' '}
                {t('collection:touch_points.in_collection')}
              </CardDescription>
            )}
          </div>
          <Button onClick={() => { setIsAddDialogOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            {t('collection:touch_points.add_button')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <LinkIcon className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              {t('collection:touch_points.empty_title')}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {t('collection:touch_points.empty_description')}
            </p>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('collection:touch_points.add_first')}
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common:form.fields.name', { field: '' })}</TableHead>
                  <TableHead>{t('common:label.short_link')}</TableHead>
                  <TableHead>{t('touchpoint:form.labels.destination')}</TableHead>
                  <TableHead>{t('common:module.type')}</TableHead>
                  <TableHead className="w-[100px]">{t('common:actions.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {touchPoints.map((tp) => (
                  <TableRow key={tp.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/org/${orgId}/short-links/${tp.id}`}
                        className="hover:underline flex items-center gap-2"
                      >
                        {tp.name}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <a
                        href={tp.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {tp.short_url}
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {tp.content_value || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {tp.content_type && tp.content_type === 'URL' ? 'LINK' : 'QR'}
                        {!tp.content_type && 'LINK'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleRemove(tp.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {/* Add Touch Point Dialog */}
      <AddTouchPointDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        collectionId={collectionId}
        orgId={orgId}
      />
    </Card>
  )  
}
