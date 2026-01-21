import { CategoryData } from "@/app/api/v1/categories/types";

export type EventsTableHeaderProps = {
  selectedCount: number;
  totalCount: number;
  showOriginalText: boolean;
  onToggleAll: () => void;
  onToggleTextMode: () => void;
  className?: string;
  // Category filter props
  categories: CategoryData[];
  selectedCategoryIds: string[];
  onCategoryFilterChange: (categoryIds: string[]) => void;
};
