'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Plus, Trash2, Globe, Info } from 'lucide-react'
import { useAddHostname, useRemoveHostname } from '../hooks/mutations'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'

interface Props {
  org_id: string
  hostnames: string[]
}

export const AllowedHostnamesSection = ({ org_id, hostnames }: Props) => {
  const { t } = useTranslation('setting')
  const [newHostname, setNewHostname] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const addHostnameMutation = useAddHostname(org_id)
  const removeHostnameMutation = useRemoveHostname(org_id)

  const handleAddHostname = async () => {
    if (!newHostname.trim()) {
      toast.error(t('analytics_settings.allowed_hostnames.empty_error', 'Hostname cannot be empty'))
      return
    }

    try {
      await addHostnameMutation.mutateAsync(newHostname.trim().toLowerCase())
      toast.success(t('analytics_settings.allowed_hostnames.added', 'Hostname added successfully'))
      setNewHostname('')
      setIsDialogOpen(false)
    } catch (error: any) {
      const message =
        error?.response?.data?.message || t('common:messages.error.default', 'An error occurred')
      toast.error(message)
    }
  }

  const handleRemoveHostname = async (hostname: string) => {
    try {
      await removeHostnameMutation.mutateAsync(hostname)
      toast.success(
        t('analytics_settings.allowed_hostnames.removed', 'Hostname removed successfully')
      )
    } catch (error) {
      toast.error(t('common:messages.error.default', 'An error occurred'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        {t(
          'analytics_settings.allowed_hostnames.description',
          'Only domains in this list can send conversion tracking events using your publishable key. This provides security by preventing unauthorized tracking.'
        )}
      </p>

      <Alert variant={'info'}>
        <AlertDescription>
          {t(
            'analytics_settings.allowed_hostnames.help',
            'Use exact domains (example.com) or wildcards (*.example.com) for subdomains. Wildcards only match subdomains, not the root domain.'
          )}
        </AlertDescription>
      </Alert>

      {/* Hostname List */}
      <div className="flex flex-col gap-2">
        {hostnames.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
            <Globe className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm">
              {t('analytics_settings.allowed_hostnames.empty', 'No hostnames configured yet')}
            </p>
            <p className="text-xs mt-1">
              {t(
                'analytics_settings.allowed_hostnames.empty_hint',
                'Add your website domain to start tracking conversions'
              )}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {hostnames.map((hostname) => (
              <div
                key={hostname}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <span className="font-mono text-sm">{hostname}</span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('analytics_settings.allowed_hostnames.remove_title', 'Remove Hostname?')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t(
                          'analytics_settings.allowed_hostnames.remove_warning',
                          'Tracking from this hostname will be blocked immediately. Are you sure you want to remove "{hostname}"?',
                          { hostname }
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common:buttons.cancel', 'Cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveHostname(hostname)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        {t('common:buttons.delete', 'Delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Hostname Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2 self-start">
            <Plus className="h-4 w-4" />
            {t('analytics_settings.allowed_hostnames.add', 'Add Hostname')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('analytics_settings.allowed_hostnames.add_title', 'Add Allowed Hostname')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'analytics_settings.allowed_hostnames.add_description',
                'Enter a domain or subdomain pattern to allow tracking from.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <Input
              placeholder="example.com or *.example.com"
              value={newHostname}
              onChange={(e) => setNewHostname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddHostname()
                }
              }}
            />
            <div className="text-xs text-slate-500 space-y-1">
              <p>
                <strong>example.com</strong> -{' '}
                {t(
                  'analytics_settings.allowed_hostnames.example_exact',
                  'Tracks from example.com only'
                )}
              </p>
              <p>
                <strong>*.example.com</strong> -{' '}
                {t(
                  'analytics_settings.allowed_hostnames.example_wildcard',
                  'Tracks from all subdomains (app.example.com, www.example.com)'
                )}
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common:buttons.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleAddHostname} disabled={addHostnameMutation.isPending}>
              {addHostnameMutation.isPending
                ? t('common:buttons.loading', 'Loading...')
                : t('analytics_settings.allowed_hostnames.add', 'Add Hostname')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
