import { ReactNode } from "react";

export type EventCategoriesProps = {
  children?: ReactNode;
  className?: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
};
