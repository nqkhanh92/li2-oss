import { Label } from '@/shared/components/ui/label'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { ColumnDefinition } from '../../utils/data-transformer'

interface ColumnSelectorProps {
  columns: ColumnDefinition[]
  selectedColumns: string[]
  onToggle: (columnId: string) => void
  label: string
}

export const ColumnSelector = ({
  columns,
  selectedColumns,
  onToggle,
  label,
}: ColumnSelectorProps) => {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex flex-col">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex items-center gap-1 px-4 py-1.5 rounded hover:bg-slate-50 cursor-pointer"
            onClick={() => onToggle(column.id)}
          >
            <Checkbox
              id={column.id}
              checked={selectedColumns.includes(column.id)}
              onCheckedChange={() => onToggle(column.id)}
            />
            <Label
              htmlFor={column.id}
              className="text-sm font-normal text-slate-700 cursor-pointer flex-1"
            >
              {column.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
