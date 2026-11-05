import React from "react";
import { useDebouncyEffect } from "use-debouncy";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { cn } from "@/shared/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Button } from "../ui/button";
import { Pipette } from "lucide-react";
import { defaultColorOptions } from "@/shared/constants/utils";

type TDebouncePicker = {
  color: string;
  onChange: (value: string, offset: number) => void;
  offset: number;
  inputStyle?: React.CSSProperties;
};

export const DebouncedPicker = ({
  color,
  onChange,
  offset,
  inputStyle,
}: TDebouncePicker) => {
  const [value, setValue] = React.useState({ color, offset });
  useDebouncyEffect(() => onChange(value.color, value.offset), 100, [
    value.color,
  ]);

  return (
    <div className="w-full flex items-center gap-3 max-w-[400px]">
      <div className="flex gap-2 items-center">
        {defaultColorOptions.map((item) => {
          return (
            <div
              key={item}
              className={cn(
                "rounded-[8px] border flex items-center justify-center h-9! w-9! min-w-9",
                item === color && "border-primary"
              )}
            >
              <div
                style={{ backgroundColor: item }}
                className="rounded-sm cursor-pointer w-6! h-6!"
                onClick={() => {
                  onChange(item, offset);
                  setValue({ ...value, color: item });
                }}
              />
            </div>
          );
        })}
      </div>
      <Popover>
        <PopoverTrigger>
          <Pipette
            className="w-9! h-9! p-2 flex items-center justify-center rounded-[8px] bg-neutral-400 text-primary"
            size={20}
          />
        </PopoverTrigger>
        <PopoverContent>
          <div className="flex-col gap-4 flex items-center justify-center">
            <HexColorPicker
              color={value.color}
              onChange={(newColor) => setValue({ ...value, color: newColor })}
            />
            <div
              className={cn(
                "flex gap-2 text-small items-center",
                "tap-highlight-transparent",
                "transition-background duration-150! transition-colors motion-reduce:transition-none",
                "rounded-[8px] border border-input px-3 py-2"
              )}
            >
              <span className="text-gray-500">#</span>
              <HexColorInput
                style={inputStyle}
                placeholder="000000"
                color={value.color}
                onChange={(newColor) => setValue({ ...value, color: newColor })}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
