import { CategoryData } from "@/app/api/v1/categories/types";
import { CurrencyData } from "@/app/api/v1/currencies/types";

export type CurrentViewInfo = {
  id: string;
  name: string;
  eventCount: number;
};

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
  /**
   * Non-blocking bulk category update. Fires and forgets with toast notifications.
   */
  onBulkCategoryUpdate: (categoryIds: string[]) => void;
  /**
   * Non-blocking bulk currency update. Fires and forgets with toast notifications.
   */
  onBulkCurrencyUpdate: (currencyId: string) => void;
  /**
   * Non-blocking bulk date update. Fires and forgets with toast notifications.
   */
  onBulkDateUpdate: (newDate: Date) => void;
  // Create view props
  /**
   * Set of selected event IDs for creating a view
   */
  selectedEventIds: Set<string>;
  /**
   * Callback to open the create view modal
   */
  onCreateViewClick: () => void;
  // Current view props
  /**
   * Information about the currently displayed view (if viewing a saved view)
   */
  currentView?: CurrentViewInfo;
  // Bulk valuation props
  /**
   * Callback to valuate selected inventory items
   */
  onBulkValuate: () => void;
  /**
   * Whether bulk valuation is currently in progress
   */
  isBulkValuating?: boolean;
  /**
   * Callback to report the header height for dynamic padding
   */
  onHeightChange?: (height: number) => void;
  /**
   * Callback to scroll to today's date (or closest) in the table
   */
  onScrollToToday?: () => void;
};
