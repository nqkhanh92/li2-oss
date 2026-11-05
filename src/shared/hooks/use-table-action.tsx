"use client";

import { TableActionContext } from "@/shared/providers/table-action-provider";
import { useContext } from "react";

function useTableAction() {
  const context = useContext(TableActionContext);
  if (!context) {
    throw new Error("useTableAction must be used within a TableActionProvider");
  }
  return context;
}

export default useTableAction;
