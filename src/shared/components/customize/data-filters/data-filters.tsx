"use client";

import { Input } from "../../ui/input";

type FilterState = Record<string, any>;
type DataFiltersProps = {
  children: React.ReactNode;
};

export const DataFilters = ({ children }: DataFiltersProps) => {
  return <div className="flex flex-wrap gap-4">{children}</div>;
};
