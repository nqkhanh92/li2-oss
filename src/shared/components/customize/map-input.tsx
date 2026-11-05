import React, { ComponentProps, useImperativeHandle, useMemo, useState } from 'react'
import { Input } from '@/shared/components/ui/input'
import Map, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useSearchLocation } from '@/shared/hooks/use-query-mapbox'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/shared/components/ui/command'
import { v4 as uuidv4 } from 'uuid'

type MapInputProps = {
  defaultValue?: {
    latitude: number | undefined
    longitude: number | undefined
  }
}
export type MapInputRef = {
  getValue: () => {
    latitude: number | undefined
    longitude: number | undefined
  }
}
export const MapInput = React.forwardRef<MapInputRef, MapInputProps>(
  ({ ...props }: MapInputProps, ref) => {
    const [search, setSearch] = useState('')
    const debounceSearch = useDebounce(search, 500)
    const { data, isLoading } = useSearchLocation(debounceSearch)
    const [isFocus, setIsFocus] = useState(false)
    const initialValues = useMemo(() => {
      if (props?.defaultValue?.latitude && props?.defaultValue?.longitude) {
        if (
          props.defaultValue?.latitude > 90 ||
          props.defaultValue?.latitude < -90 ||
          props.defaultValue?.longitude > 180 ||
          props.defaultValue?.longitude < -180
        )
          return {
            latitude: 14.0583,
            longitude: 108.2772,
            zoom: 5,
          }
        return {
          latitude: props.defaultValue?.latitude,
          longitude: props.defaultValue?.longitude,
          zoom: 15,
        }
      }
      return {
        latitude: 14.0583,
        longitude: 108.2772,
        zoom: 5,
      }
    }, [props.defaultValue])
    const [viewState, setViewState] = useState(initialValues)
    useImperativeHandle(ref, () => {
      return {
        getValue: () => ({
          latitude: viewState.latitude,
          longitude: viewState.longitude,
        }),
      }
    })
    return (
      <div>
        <div className="relative">
          <Command
            shouldFilter={false}
            className="rounded-lg border shadow-md absolute z-50 top-0 left-0 h-auto w-[calc(100%-18px)] mx-2 mt-2"
          >
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              onFocus={() => setIsFocus(true)}
            />
            <CommandList>
              {isFocus && data && data?.features?.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {data?.features?.map((suggestion) => {
                    const text =
                      suggestion.properties.full_address ||
                      `${suggestion.properties.name}, ${suggestion.properties.place_formatted}`
                    return (
                      <CommandItem
                        key={suggestion.properties.mapbox_id}
                        onSelect={(e) => {
                          setSearch(text)
                          setIsFocus(false)
                          setViewState((pre) => ({
                            ...pre,
                            latitude: suggestion.geometry.coordinates[1],
                            longitude: suggestion.geometry.coordinates[0],
                            zoom: 15,
                          }))
                        }}
                      >
                        {text}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
        <Map
          // Khoá Mapbox của chính người vận hành. Lấy ở https://account.mapbox.com/access-tokens
          // Bỏ trống thì ô chọn vị trí trên bản đồ không hiện; phần còn lại vẫn chạy.
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          onMove={(evt) => setViewState((pre) => ({ ...pre, ...evt.viewState }))}
          {...viewState}
          style={{ width: 'auto', height: 400 }}
          mapStyle="mapbox://styles/mapbox/streets-v9"
        >
          <Marker longitude={viewState.longitude} latitude={viewState.latitude} anchor="bottom" />
        </Map>
      </div>
    )
  }
)
