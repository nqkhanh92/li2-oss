import { ComponentProps, useEffect, useRef } from "react";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { MapIcon } from "lucide-react";
import { useState } from "react";
import { CustomDialog } from "./custom-dialog";
import { MapInput, MapInputRef } from "./map-input";

type Coordinates = {
  latitude: number | undefined;
  longitude: number | undefined;
};
type CustomMapInputProps = {
  value: Coordinates;
  onChange?: (value: Coordinates, extra?: Record<string, any>) => void;
};
export const CustomMapInput = ({ ...props }: CustomMapInputProps) => {
  const [value, setValue] = useState<Coordinates>({
    latitude: props.value.latitude || undefined,
    longitude: props.value.longitude || undefined,
  });
  const handleValueChange = (
    latitude: number | undefined,
    longitude: number | undefined
  ) => {
    const newValues = {
      latitude: latitude ? parseFloat(latitude.toFixed(7)) : value.latitude,
      longitude: longitude ? parseFloat(longitude.toFixed(7)) : value.longitude,
    };
    setValue(newValues);
  };
  useEffect(() => {
    props.onChange?.(value);
  }, [value]);
  const ref = useRef<MapInputRef>(null);
  return (
    <div className="w-full flex border-input border-2 rounded-md">
      <Input
        placeholder="Latitude"
        max={90.0}
        step={0.0000001}
        min={-90.0}
        type="number"
        className="border-none shadow-none focus:rounded-r-none"
        value={value.latitude}
        onChange={(e) => handleValueChange(Number(e.target.value), undefined)}
      />
      <Separator orientation="vertical" className="h-auto" />
      <Input
        placeholder="Longitude"
        max={180.0}
        min={-180.0}
        step={0.0000001}
        type="number"
        className="border-none shadow-none focus:rounded-l-none"
        value={value.longitude}
        onChange={(e) => handleValueChange(undefined, Number(e.target.value))}
      />
      <CustomDialog
        button={
          <Button
            type="button"
            variant="ghost"
            className="rounded-none bg-slate-200"
          >
            <MapIcon className="w-4 h-4" />
          </Button>
        }
        size="sm"
        title="Map"
        noFooter
      >
        {({ close }) => (
          <div>
            <MapInput defaultValue={value} ref={ref} />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                onClick={() => {
                  handleValueChange(
                    ref.current?.getValue().latitude,
                    ref.current?.getValue().longitude
                  );
                  close();
                }}
              >
                Apply
              </Button>
              <Button variant="outline" type="button" onClick={() => close()}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CustomDialog>
    </div>
  );
};
