import { cn } from "@/shared/lib/utils";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
};
export const CustomCard = ({
  title,
  children,
  className,
  description,
}: Props) => {
  return (
    <div className={cn("border rounded-lg relative", className)}>
      <h1 className="absolute -top-3 left-2 bg-background px-2 font-semibold">
        {title}
      </h1>
      <div className="p-4">
        {description && (
          <p className="text-muted-foreground text-sm font-sans">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};
