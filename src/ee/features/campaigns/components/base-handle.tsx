import { forwardRef } from "react";
import { Handle, HandleProps, Position } from "@xyflow/react";

import { cn } from "@/shared/lib/utils";

export type BaseHandleProps = HandleProps & {
  positionClassName?: string;
};

export const BaseHandle = forwardRef<HTMLDivElement, BaseHandleProps>(
  ({ className, positionClassName, children, ...props }, ref) => {
    return (
      <>
        <Handle
          ref={ref}
          className={cn(
            "h-[11px] w-[11px] rounded-full border border-slate-300 bg-slate-100 transition dark:border-secondary dark:bg-secondary",
            className,
            positionClassName
          )}
          {...props}
        >
          {children}
        </Handle>
        {props.title && (
          <label
            style={{
              top: props.position === Position.Top ? "0" : "",
              bottom: props.position === Position.Bottom ? "12px" : "",
              left: "50%",
              transform: "translateX(-50%)",
              position: "absolute",
            }}
            className={cn(positionClassName)}
          >
            {props.title}
          </label>
        )}
      </>
    );
  }
);

BaseHandle.displayName = "BaseHandle";
