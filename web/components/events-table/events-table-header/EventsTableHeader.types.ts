import { CategoryData } from "@/app/api/v1/categories/types";
import { CurrencyData } from "@/app/api/v1/currencies/types";

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
  // Bulk update props
  currencies: CurrencyData[];
  onBulkCategoryUpdate: (categoryIds: string[]) => Promise<void>;
  onBulkCurrencyUpdate: (currencyId: string) => Promise<void>;
  isBulkUpdateLoading?: boolean;
};
