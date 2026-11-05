import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/shared/lib/utils";

type LoadingButtonProps = {
  /** Spinner REPLACES the label and the button is disabled — the historical behaviour. */
  isLoading?: boolean;
  /**
   * Spinner BESIDE the label, `aria-busy`, clicks ignored — but NOT `disabled`, so the button keeps
   * its full colour. "Disabled" tells the user "you cannot press this"; a request in flight is a
   * different fact — "it is working" — and the artifact replace dialog's intent forbids dimming it
   * (spec R7c). Callers swap the label themselves ("Đang cập nhật…").
   */
  busy?: boolean;
  disabled?: boolean;
} & React.ComponentProps<typeof Button>;

export const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps
>(function LoadingButton({ isLoading, busy, className, ...props }, ref) {
  return (
    <Button
      ref={ref}
      {...props}
      aria-busy={busy || undefined}
      className={cn(className, busy && "pointer-events-none")}
      disabled={isLoading || props.disabled}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {props.children}
        </>
      ) : (
        props.children
      )}
    </Button>
  );
});
LoadingButton.displayName = "LoadingButton";
