import states from '@/shared/constants/states.json'
import { MultipleCommandSelect } from '../../../../../../shared/components/customize/multiple-command-select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Button } from '@/shared/components/ui/button'
import { useState, useEffect } from 'react'
import { useDebounce, useDebounceFn } from '@/shared/hooks/use-debounce'
import { Input } from '../../../../../../shared/components/ui/input'
type CitySelectProps = {
  value: string[]
  onChange: (value: string[]) => void
}
export const CitySelect = ({ value, onChange }: CitySelectProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)
  const [cities, setCities] = useState(states.slice(0, 20).map((state) => state.name))

  useEffect(() => {
    const filteredCities = states
      .filter((state) => state.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
      .slice(0, 20)
    setCities(filteredCities.map((state) => state.name))
  }, [debouncedSearch])
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Select City</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div
          onKeyDown={(e) => {
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <Input
            type="text"
            placeholder="Search city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DropdownMenuSeparator />
        <div className="w-[320px] max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <DropdownMenuCheckboxItem disabled>Loading...</DropdownMenuCheckboxItem>
          ) : (
            cities.map((city) => (
              <DropdownMenuCheckboxItem
                key={city}
                checked={value.includes(city)}
                onSelect={(e) => {
                  e.preventDefault()
                }}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...value, city])
                  } else {
                    onChange(value.filter((item) => item !== city))
                  }
                }}
              >
                {city}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
