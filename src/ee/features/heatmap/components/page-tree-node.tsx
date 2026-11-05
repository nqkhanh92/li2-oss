'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Globe, Folder, FileText, Check, Flame } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { PageTreeNode as PageTreeNodeType } from '../types'

interface PageTreeNodeProps {
  node: PageTreeNodeType
  depth: number
  selectedPath: string | null
  selectedHostname: string | null
  expanded: boolean
  onToggle: (nodeId: string) => void
  onSelect: (path: string, hostname: string, scheme: string) => void
  nodeId: string
  focusedNodeId?: string | null
}

export function PageTreeNode({
  node,
  depth,
  selectedPath,
  selectedHostname,
  expanded,
  onToggle,
  onSelect,
  nodeId,
  focusedNodeId,
}: PageTreeNodeProps) {
  const isSelected = node.type === 'leaf'
    && node.fullPath === selectedPath
    && node.hostname === selectedHostname
  const hasChildren = node.children.length > 0
  const paddingLeft = depth === 0 ? 10 : 10 + depth * 20

  const handleClick = () => {
    if (node.type === 'leaf' && node.fullPath) {
      onSelect(node.fullPath, node.hostname, node.scheme)
    } else {
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
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-selected={isSelected}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {node.type === 'domain' ? (
          <DomainFavicon hostname={node.hostname} />
        ) : node.type === 'folder' ? (
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        ) : isSelected ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
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

        <span className="ml-auto shrink-0">
          {node.type === 'domain' ? (
            <span className="text-[10px] text-muted-foreground">
              {node.pageCount}
            </span>
          ) : node.type === 'folder' ? (
            <span className="text-[10px] text-muted-foreground">
              {node.clickCount.toLocaleString()}
            </span>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 text-[10px]',
                node.isHot
                  ? 'bg-destructive/20 text-red-400'
                  : 'bg-primary/10 text-primary',
              )}
            >
              {node.clickCount.toLocaleString()}
              {node.isHot && <Flame className="h-2.5 w-2.5" />}
            </span>
          )}
        </span>
      </button>
    </>
  )
}

/**
 * IMPORTANT: PageTreeNode renders ONLY its own row — no children.
 * The sidebar (PageTreeSidebar) controls all recursion via renderTree().
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
