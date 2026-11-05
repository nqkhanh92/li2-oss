import React from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useTranslation } from "react-i18next";

type ConfirmButtonProps = {
  title: string;
  onConfirm: () => void;
} & React.ComponentProps<typeof Button>;
export const ConfirmButton = ({
  title,
  onConfirm,
  ...buttonProps
}: ConfirmButtonProps) => {
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation("common");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button {...buttonProps} />
      </PopoverTrigger>
      <PopoverContent>
        <div className="px-2">
          <div className="font-light text-sm">{title}</div>
          <div className="flex justify-end gap-2 mt-2">
            {/* <Button
              variant="outline"
              className="px-2 py-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button> */}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              className="gap-[6px] text-slate-600"
            >
              {t("buttons.cancel")}
            </Button>
            <Button
              variant="destructive"
              className="px-2 py-1"
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              {t("buttons.confirm")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
