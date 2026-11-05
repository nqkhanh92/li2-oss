import { ruleItemSchema, RuleType } from '@/shared/schemas/touch-points/dynamic-targeting'
import { z } from 'zod'
import { RuleSingle, RuleSingleEditDialog } from './rule-single'
import { RuleBlock, RuleBlockEditDialog } from './rule-block'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Edit2Icon, GripVertical, PencilLine, Trash2Icon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useState } from 'react'
import { LoadingButton } from '@/shared/components/customize/loading-button'

type RuleItemProps = {
  id: string
  field: z.infer<typeof ruleItemSchema>
  onChange: (field: z.infer<typeof ruleItemSchema>) => void
  index: number
  onDelete: () => Promise<void>
  onEdit: () => void
}

export const RuleItem = ({ id, field, onChange, index, onDelete, onEdit }: RuleItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }
  const [deleting, setDeleting] = useState(false)
  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  const getActions = () => {
    return (
      <div className="flex">
        <Button className="w-9 h-9" type="button" variant="ghost" onClick={onEdit}>
          <PencilLine className="w-[18px] h-[18px]" />
        </Button>
        <LoadingButton
          className="w-9 h-9"
          type="button"
          variant="ghost"
          onClick={handleDelete}
          isLoading={deleting}
        >
          <Trash2Icon className="w-[18px] h-[18px]" />
        </LoadingButton>
      </div>
    )
  }

  return (
    <div
      className="flex bg-background gap-3 border border-slate-300 rounded-lg items-start px-4 py-4"
      id={id}
      ref={setNodeRef}
      style={style}
    >
      <div className="flex-1 w-full">
        {field.type === RuleType.SINGLE ? (
          <RuleSingle
            grabbableButton={
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing w-9 flex flex-col items-center"
              >
                <GripVertical className="w-[18px] h-[18px] text-slate-700" />
              </div>
            }
            field={field}
            actions={getActions()}
          />
        ) : (
          <RuleBlock
            grabbableButton={
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing w-9 flex flex-col items-center"
              >
                <GripVertical className="w-[18px] h-[18px] text-slate-700" />
              </div>
            }
            field={field}
            actions={getActions()}
          />
        )}
      </div>
    </div>
  )
}
