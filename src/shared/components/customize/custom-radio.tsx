import { cn } from "@/shared/lib/utils";

type RadioItem = {
  label: string;
  value: string;
  icon: React.ReactNode;
  enabled?: boolean;
};
type CustomRadioProps = {
  value: string | undefined;
  onChange: (value: string) => void;
  options: RadioItem[];
  allowDeselect?: boolean;
  render?: (option: RadioItem) => React.ReactNode;
  itemWrapperClassName?: string;
};

export const CustomRadio = ({
  value,
  onChange,
  options,
  render,
  itemWrapperClassName,
}: CustomRadioProps) => {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <label
          className={cn(
            `flex flex-col items-center gap-2 p-2 rounded-lg w-24 h-24 justify-center border-2 border-dashed has-[input:checked]:border-solid has-[input:checked]:border-blue-500 cursor-pointer ${itemWrapperClassName}`,
            option.enabled ? "" : "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            className="hidden"
            type="radio"
            value={option.value}
            checked={value === option.value}
            onChange={() => {
              if (option.enabled) {
                onChange(option.value);
              }
            }}
          />
          {render ? (
            render(option)
          ) : (
            <>
              {option.icon}
              {option.label}
            </>
          )}
        </label>
      ))}
    </div>
  );
};
