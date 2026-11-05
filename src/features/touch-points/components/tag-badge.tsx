import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import { Badge } from '@/shared/components/ui/badge'
import { Tag as LucideTag } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color?: string
}

interface TagBadgeProps {
  tag: Tag
}

const TagBadge = ({ tag }: TagBadgeProps) => {
  return (
    <Badge
      key={tag.id}
      color={tag.color}
      variant="outline"
      className="px-3 py-1 border-none outline-hidden text-xs text-center items-center justify-center whitespace-nowrap overflow-hidden text-ellipsis"
    >
      <span className="block md:hidden">
        {tag.name.length > 13 ? `${tag.name.slice(0, 13)}...` : tag.name}
      </span>

      <span className="hidden md:block">
        {tag.name.length > 30 ? `${tag.name.slice(0, 30)}...` : tag.name}
      </span>
    </Badge>
  )
}

interface TagListProps {
  tp_tag_links: { tags: Tag }[]
}

export const TagList = ({ tp_tag_links }: TagListProps) => {
  return (
    <div className="flex flex-row items-center gap-2">
      <LucideTag className="w-3 h-3 min-w-3 min-h-3" />

      <div className="hidden md:flex gap-2">
        {tp_tag_links.slice(0, 3).map((link) => (
          <TagBadge key={link.tags.id} tag={link.tags} />
        ))}
      </div>
      <CustomToolTip
        contentClassName="bg-background rounded-[8px] px-4 py-3 border border-slate-200"
        content={
          <div className="grid grid-cols-2 gap-2">
            {tp_tag_links.slice(3).map((link) => (
              <TagBadge key={link.tags.id} tag={link.tags} />
            ))}
          </div>
        }
        side="bottom"
      >
        <>
          {tp_tag_links.length > 3 && (
            <span className="hidden md:flex items-center text-xs">+{tp_tag_links.length - 3}</span>
          )}
        </>
      </CustomToolTip>

      <div className="flex md:hidden gap-2">
        {tp_tag_links.slice(0, 1).map((link) => (
          <TagBadge key={link.tags.id} tag={link.tags} />
        ))}
      </div>
      <CustomToolTip
        contentClassName="bg-background rounded-[8px] px-4 py-3 border border-slate-200"
        content={
          <div className="grid grid-cols-2 gap-2">
            {tp_tag_links.slice(1).map((link) => (
              <TagBadge key={link.tags.id} tag={link.tags} />
            ))}
          </div>
        }
        side="bottom"
      >
        <>
          {tp_tag_links.length > 1 && (
            <span className="flex md:hidden items-center text-xs">+{tp_tag_links.length - 1}</span>
          )}
        </>
      </CustomToolTip>
    </div>
  )
}
