import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";
import { AlertCircleIcon, CheckIcon, InfoIcon, XIcon } from "lucide-react";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "[&_svg]:text-red-600 [&_h5]:text-red-600 [&_#alert-description]:text-slate-600 bg-red-50 [&_h5]:font-semibold [&_#alert-description]:font-normal",
        warning:
          "[&_svg]:text-yellow-600 [&_h5]:text-yellow-600 [&_#alert-description]:text-slate-600 bg-yellow-50 [&_h5]:font-semibold [&_#alert-description]:font-normal",
        success:
          "[&_svg]:text-green-600 [&_h5]:text-green-600 [&_#alert-description]:text-slate-600 bg-green-50 [&_h5]:font-semibold [&_#alert-description]:font-normal",
        info: "[&_svg]:text-blue-600 [&_h5]:text-blue-600 [&_#alert-description]:text-slate-600 bg-blue-50 [&_h5]:font-semibold [&_#alert-description]:font-normal",
      },
      size: {
        lg: "[&_svg]:w-7 [&_svg]:h-7 [&_svg]:min-w-7 [&_svg]:min-h-7 [&_h5]:text-[18px] [&_#alert-description]:text-[14px] p-6 [&_h5]:line-height-[28px] [&_#alert-description]:line-height-[20px]",
        default:
          "[&_svg]:w-5 [&_svg]:h-5 [&_svg]:min-w-5 [&_svg]:min-h-5  [&_h5]:text-[14px] [&_#alert-description]:text-[12px] p-4 [&_h5]:line-height-[20px] [&_#alert-description]:line-height-[16px]",
        sm: "[&_svg]:w-4 [&_svg]:h-4 [&_h5]:text-[12px] [&_#alert-description]:text-[10px] p-4 [&_h5]:line-height-[16px] [&_#alert-description]:line-height-[16px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
const AlertIcon = ({
  variant,
}: {
  variant: VariantProps<typeof alertVariants>["variant"];
}) => {
  switch (variant) {
    case "default":
      return <InfoIcon />;
    case "destructive":
      return <XIcon />;
    case "warning":
      return <AlertCircleIcon />;
    case "success":
      return <CheckIcon />;
    case "info":
      return <InfoIcon />;
  }
};
AlertIcon.displayName = "AlertIcon";

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants> & { icon?: React.ReactNode }
>(({ className, variant, size, icon, children, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant, size }), "border-none", className)}
    {...props}
  >
    <div className="flex gap-2">
      {icon ?? <AlertIcon variant={variant} />}
      <div>{children}</div>
    </div>
  </div>
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    id="alert-description"
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, AlertIcon };
