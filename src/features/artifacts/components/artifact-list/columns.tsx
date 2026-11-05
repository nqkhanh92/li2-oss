'use client'

import { ColumnDef } from '@tanstack/react-table'

import type { ArtifactDTO } from '@/core/types/artifact.type'
import { ArtifactCard } from './artifact-card'

export const artifactColumns: ColumnDef<ArtifactDTO>[] = [
  {
    id: 'artifact',
    enableSorting: false,
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => {
      if (!row.original) return null
      return <ArtifactCard row={row} key={`card-${row.original.id}`} />
    },
  },
]
