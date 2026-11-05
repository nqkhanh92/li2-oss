"use client";
import { toast as toaster } from "sonner";

type ToasterToast = {
  id?: string | number;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant: "success" | "info" | "destructive" | "warning" | "default";
};

const toast = ({ id, title, description, variant }: ToasterToast) => {
  const opts = { description, id };
  switch (variant) {
    case "success":
      toaster.success(title, opts);
      break;
    case "destructive":
      toaster.error(title, opts);
      break;
    case "warning":
      toaster.warning(title, opts);
      break;
    case "info":
      toaster.info(title, opts);
      break;
    default:
      toaster(title, opts);
  }
};

export { toast };
