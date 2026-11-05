'use client'

import { ArrowLeft, FolderIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface CollectionDetailHeaderProps {
  name: string
  description?: string | null
  color?: string | null
  handleBack: () => void
}

export const CollectionDetailHeader = ({
  name,
  description,
  color,
  handleBack,
}: CollectionDetailHeaderProps) => {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="h-8 w-8 rounded-full hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {color ? (
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            <FolderIcon className="h-4 w-4 text-white" />
          </div>
        ) : (
          <FolderIcon className="h-6 w-6 text-slate-600 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{name}</h1>
          {description && (
            <p className="text-sm text-slate-500 truncate">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
