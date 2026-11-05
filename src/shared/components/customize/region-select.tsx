import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { CustomDialog, DialogCustomRef } from './custom-dialog'
import { MultipleCommandSelect } from './multiple-command-select'
import { SingleCommandSelect } from './single-command-select'
import { Button } from '../ui/button'
import { flatContinents, flatCountries, flatStates, regions } from '@/shared/constants/regions'

type MultipleRegionSelectProps = {
  defaultValue: {
    regions: string[]
    countries?: string[]
    cities?: string[]
  }
  multiSelect: true
  onChange?: (value: { regions: string[]; countries?: string[]; cities?: string[] }) => void
}
type SingleRegionSelectProps = {
  defaultValue: {
    regions: string
    countries?: string
    cities?: string
  }
  multiSelect: false
  onChange?: (value: { regions: string; countries?: string; cities?: string }) => void
}
export type RegionSelectValue = { regions: string[]; countries?: string[]; cities?: string[] }

export type RegionSelectRef = {
  showAndGetResult: (currentValue?: RegionSelectValue) => Promise<RegionSelectValue | null>
}
type RegionSelectProps = MultipleRegionSelectProps | SingleRegionSelectProps
const RegionSelectImpl = (props: RegionSelectProps, ref: React.Ref<RegionSelectRef>) => {
  const { defaultValue, multiSelect, onChange } = props
  const [selectedContinents, setSelectedContinents] = useState<string[]>(
    Array.isArray(defaultValue.regions) ? defaultValue.regions : [defaultValue.regions]
  )

  const countries = useMemo(() => {
    return Object.entries(regions)
      .filter(([key, value]) => value.countries && selectedContinents.includes(key))
      .map(([key, value]) => ({
        value: key,
        label: value.label,
      }))
  }, [selectedContinents])

  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    defaultValue.countries
      ? Array.isArray(defaultValue.countries)
        ? defaultValue.countries
        : [defaultValue.countries]
      : []
  )

  const states = useMemo(() => {
    return Object.entries(regions)
      .filter(([key, value]) => selectedContinents.includes(key))
      .flatMap(([key, value]) => Object.entries(value.countries))
      .filter(([key, value]) => selectedCountries.includes(key))
      .flatMap(([key, value]) => Object.entries(value.states))
      .map(([key, value]) => ({
        value: key,
        label: value,
      }))
  }, [selectedContinents, selectedCountries])

  const [selectedCities, setSelectedCities] = useState<string[]>(
    defaultValue.cities
      ? Array.isArray(defaultValue.cities)
        ? defaultValue.cities
        : [defaultValue.cities]
      : []
  )
  const pendingResolve = useRef<
    | ((
        v: {
          regions: string[]
          countries?: string[]
          cities?: string[]
        } | null
      ) => void)
    | null
  >(null)
  const dialogRef = useRef<DialogCustomRef>(null)
  const isOpen = useRef(false)

  useImperativeHandle(ref, () => ({
    showAndGetResult: (currentValue?: RegionSelectValue) => {
      if (isOpen.current) {
        // prevent parallel calls (optional)
        return Promise.reject(new Error('Dialog already open'))
      }
      if (currentValue) {
        setSelectedContinents(currentValue.regions)
        setSelectedCountries(currentValue.countries ?? [])
        setSelectedCities(currentValue.cities ?? [])
      }

      isOpen.current = true
      dialogRef.current?.open()

      return new Promise<{ regions: string[]; countries?: string[]; cities?: string[] } | null>(
        (resolve) => {
          pendingResolve.current = (result) => {
            resolve(result)
            pendingResolve.current = null
            isOpen.current = false
          }
        }
      )
    },
  }))
  const handleSubmit = () => {
    pendingResolve.current?.({
      regions: selectedContinents,
      countries: selectedCountries,
      cities: selectedCities,
    })
    isOpen.current = false
    dialogRef.current?.close()
  }

  const countryOptions: { label: string; value: string }[] = useMemo(() => {
    return flatCountries.filter((country) => selectedContinents.includes(country.region))
  }, [selectedContinents])
  const cityOptions: { label: string; value: string }[] = useMemo(() => {
    return flatStates.filter((state) => selectedCountries.includes(state.country))
  }, [selectedCountries])

  useEffect(() => {
    const newCities = cityOptions.map((city) => city.value)
    setSelectedCities((pre) => pre.filter((city) => newCities.includes(city)))
  }, [selectedContinents, selectedCountries])

  useEffect(() => {
    const newCountries = countryOptions.map((country) => country.value)
    setSelectedCountries((pre) => pre.filter((country) => newCountries.includes(country)))
  }, [selectedContinents])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      isOpen.current = false
      pendingResolve.current = null
    }
  }
  return (
    <CustomDialog
      onOpenChange={handleOpenChange}
      size="md"
      ref={dialogRef}
      title="Select Region"
      noButton
      noFooter
    >
      {({ open, close }) => {
        return (
          <div className="space-y-2">
            <div className="flex flex-col lg:flex-row gap-2">
              {multiSelect ? (
                <>
                  <MultipleCommandSelect
                    className="text-sm"
                    modal
                    value={selectedContinents}
                    onChange={(value) => {
                      setSelectedContinents(value)
                    }}
                    options={flatContinents}
                    placeholder="Select Continents"
                  />
                  <MultipleCommandSelect
                    className="text-sm"
                    modal
                    value={selectedCountries}
                    onChange={(value) => {
                      setSelectedCountries(value)
                    }}
                    options={countryOptions}
                    placeholder={
                      selectedContinents.length > 0
                        ? 'Select Countries'
                        : 'Please select Continents first'
                    }
                  />
                  <MultipleCommandSelect
                    className="text-sm"
                    modal
                    value={selectedCities}
                    onChange={(value) => {
                      setSelectedCities(value)
                    }}
                    options={cityOptions}
                    placeholder={
                      selectedCountries.length > 0
                        ? 'Select Cities'
                        : 'Please select Countries first'
                    }
                  />
                </>
              ) : (
                <SingleCommandSelect
                  value={selectedContinents?.[0]}
                  onChange={(value) => {
                    setSelectedContinents([value])
                  }}
                  options={flatContinents}
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  dialogRef.current?.close()
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => handleSubmit()}>Save</Button>
            </div>
          </div>
        )
      }}
    </CustomDialog>
  )
}
const RegionSelectForward = forwardRef<RegionSelectRef, RegionSelectProps>(RegionSelectImpl)

// 3) Assert overload-like call signatures for better DX:
type RegionSelectComponent = {
  (props: MultipleRegionSelectProps & React.RefAttributes<RegionSelectRef>): JSX.Element
  (props: SingleRegionSelectProps & React.RefAttributes<RegionSelectRef>): JSX.Element
} & React.NamedExoticComponent<RegionSelectProps>

export const RegionSelect = RegionSelectForward as RegionSelectComponent
RegionSelect.displayName = 'RegionSelect'
