import { Switch } from '@/shared/components/ui/switch' // adjust the import as needed

interface FormSwitchHeaderTableProps {
  variant: string
  title: string
  defaultChecked: boolean
  disabled: boolean
  checked: boolean
}

export const FormSwitchHeaderTable: React.FC<FormSwitchHeaderTableProps> = ({
  variant,
  title,
  defaultChecked,
  disabled,
  checked,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span>{variant}</span>
        <Switch
          className="flex"
          defaultChecked={defaultChecked}
          disabled={disabled}
          checked={checked}
        />
      </div>
      <div className="flex items-start gap-2">
        <span className="text-sm text-foreground font-medium">{title}</span>
      </div>
    </div>
  )
}
