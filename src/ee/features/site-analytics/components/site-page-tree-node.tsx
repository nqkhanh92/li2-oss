'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Globe, Folder, FileText, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import type { PageTreeNode as PageTreeNodeType } from '@/ee/features/heatmap/types'

interface SitePageTreeNodeProps {
  node: PageTreeNodeType
  depth: number
  selectedPath: string | null
  selectedHostname: string | null
  expanded: boolean
  onToggle: (nodeId: string) => void
  onSelect: (path: string, hostname: string, scheme: string) => void
  nodeId: string
  focusedNodeId?: string | null
  onDomainSelect?: (hostname: string, scheme: string) => void
}

export function SitePageTreeNode({
  node,
  depth,
  selectedPath,
  selectedHostname,
  expanded,
  onToggle,
  onSelect,
  nodeId,
  focusedNodeId,
  onDomainSelect,
}: SitePageTreeNodeProps) {
  const { t } = useTranslation('heatmap')

  const isSelected = (() => {
    if (node.type === 'domain') return !!onDomainSelect && selectedPath === null && node.hostname === selectedHostname
    if (node.type === 'leaf') return node.fullPath === selectedPath && node.hostname === selectedHostname
    if (node.type === 'folder' && node.selfPage) return node.selfPage.fullPath === selectedPath && node.hostname === selectedHostname
    return false
  })()

  const hasChildren = node.children.length > 0
  const paddingLeft = depth === 0 ? 10 : 10 + depth * 12

  const isDomainSelectable = node.type === 'domain' && !!onDomainSelect
  const isChevronOnly = isDomainSelectable || node.type === 'folder'

  // Non-recent only when recency tracking is active (hasRecentData !== undefined) and explicitly false
  const isNonRecent = node.hasRecentData === false

  const handleClick = () => {
    if (isDomainSelectable) {
      onDomainSelect!(node.hostname, node.scheme)
    } else if (node.type === 'leaf' && node.fullPath) {
      onSelect(node.fullPath, node.hostname, node.scheme)
    } else if (node.type === 'folder' && node.selfPage) {
      onSelect(node.selfPage.fullPath, node.hostname, node.scheme)
      if (!expanded && hasChildren) onToggle(nodeId)
    } else if (node.type === 'folder' && hasChildren) {
      onToggle(nodeId)
    }
  }

  const handleChevronClick = (e: React.MouseEvent) => {
    if (isChevronOnly) {
      e.stopPropagation()
      onToggle(nodeId)
    }
  }

  return (
    <>
      <button
        data-tree-item
        data-node-id={nodeId}
        className={cn(
          'flex w-full items-center gap-1.5 py-1 pr-2.5 text-left text-xs transition-colors',
          'hover:bg-muted/50',
          isSelected && 'bg-primary/10 border-l-2 border-primary',
          !isSelected && 'border-l-2 border-transparent',
          focusedNodeId === nodeId && 'ring-1 ring-primary ring-inset',
          isNonRecent && 'opacity-40',
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-selected={isSelected}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown
              className={cn('h-3 w-3 shrink-0 text-muted-foreground', isChevronOnly && 'cursor-pointer')}
              onClick={handleChevronClick}
            />
          ) : (
            <ChevronRight
              className={cn('h-3 w-3 shrink-0 text-muted-foreground', isChevronOnly && 'cursor-pointer')}
              onClick={handleChevronClick}
            />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {node.type === 'domain' ? (
          <DomainFavicon hostname={node.hostname} />
        ) : node.type === 'folder' ? (
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}

        <span
          className={cn(
            'truncate',
            node.type === 'domain' && 'font-semibold text-foreground',
            node.type === 'folder' && 'text-muted-foreground',
            node.type === 'leaf' && isSelected && 'font-medium text-foreground',
            node.type === 'leaf' && !isSelected && 'text-muted-foreground',
          )}
        >
          {node.label}
        </span>

        {node.type === 'leaf' ? (
          isNonRecent && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto shrink-0">
                  <AlertTriangle className="h-3 w-3 text-semantic-warning" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px] text-center">
                {t('sidebar.no_recent_tooltip')}
              </TooltipContent>
            </Tooltip>
          )
        ) : (
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
            {node.pageCount}
          </span>
        )}
      </button>
    </>
  )
}

/**
 * IMPORTANT: SitePageTreeNode renders ONLY its own row — no children.
 * The sidebar (SitePageTreeSidebar) controls all recursion via renderTree().
 */

function DomainFavicon({ hostname }: { hostname: string }) {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return (
      <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-muted">
        <Globe className="h-2.5 w-2.5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
      alt=""
      className="h-3.5 w-3.5 shrink-0 rounded-sm"
      onError={() => setImgError(true)}
    />
  )
}
