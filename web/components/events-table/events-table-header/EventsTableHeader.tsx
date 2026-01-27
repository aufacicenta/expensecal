import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import {
  ArrowLeftRight,
  ChevronDown,
  Circle,
  CircleCheckBig,
  CircleDashed,
  Coins,
  ListFilter,
  Tag,
} from "lucide-react";
import { useState } from "react";

import { EventsTableHeaderProps } from "./EventsTableHeader.types";

import { BaseCurrencySelector } from "@/components/base-currency-selector/BaseCurrencySelector";
import { ThemeSwitch } from "@/components/theme-switch";
import { useUserPreferencesContext } from "@/context/UserPreferences/useUserPreferencesContext";
import { UNCATEGORIZED_FILTER_ID } from "@/lib/calendar/filterEvents";

export const EventsTableHeader: React.FC<EventsTableHeaderProps> = ({
  selectedCount,
  totalCount,
  showOriginalText,
  onToggleAll,
  onToggleTextMode,
  categories,
  selectedCategoryIds,
  onCategoryFilterChange,
  currencies,
  onBulkCategoryUpdate,
  onBulkCurrencyUpdate,
  isBulkUpdateLoading = false,
}) => {
  const { baseCurrency } = useUserPreferencesContext();
  const isAllSelected = selectedCount > 0 && selectedCount === totalCount;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;

  // Bulk category update state
  const [bulkCategoryIds, setBulkCategoryIds] = useState<Set<string>>(
    new Set(),
  );
  // Bulk currency update state
  const [bulkCurrencyId, setBulkCurrencyId] = useState<string>("");

  const handleBulkCategorySelectionChange = (
    newSelection: "all" | Set<React.Key>,
  ) => {
    const selectedSet: Set<string> =
      newSelection === "all"
        ? new Set(
            categories
              .map((cat) => cat.id)
              .filter((id): id is string => Boolean(id)),
          )
        : new Set(
            Array.from(newSelection as Set<React.Key>)
              .map((id) => String(id))
              .filter((id): id is string => Boolean(id)),
          );

    setBulkCategoryIds(selectedSet);
  };

  const handleBulkCurrencySelectionChange = (
    newSelection: "all" | Set<React.Key>,
  ) => {
    if (newSelection === "all") return;
    const selectedArray = Array.from(newSelection as Set<React.Key>);
    const currencyId = selectedArray[0] ? String(selectedArray[0]) : "";

    setBulkCurrencyId(currencyId);
  };

  const handleApplyBulkChanges = async () => {
    // Apply category changes if any selected
    if (bulkCategoryIds.size > 0) {
      await onBulkCategoryUpdate(Array.from(bulkCategoryIds));
      setBulkCategoryIds(new Set());
    }

    // Apply currency changes if selected
    if (bulkCurrencyId) {
      await onBulkCurrencyUpdate(bulkCurrencyId);
      setBulkCurrencyId("");
    }
  };

  const hasPendingChanges = bulkCategoryIds.size > 0 || !!bulkCurrencyId;

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onCategoryFilterChange(
        selectedCategoryIds.filter((id) => id !== categoryId),
      );
    } else {
      onCategoryFilterChange([...selectedCategoryIds, categoryId]);
    }
  };

  const handleClearFilter = () => {
    onCategoryFilterChange([]);
  };

  return (
    <nav className="bg-background fixed top-0 left-0 z-50 text-xs">
      {/* App Top Bar */}
      <div className="flex w-screen items-center justify-between px-2 [&>div]:p-1">
        <div className="flex gap-1 font-mono">
          <span className="">ExpenseCal</span>
          <span className="text-default-400">v0.0.2</span>
        </div>
        <div className="flex items-center gap-2 text-right">
          <BaseCurrencySelector />
          <ThemeSwitch />
        </div>
      </div>

      {/* Bulk Actions Bar - visible when events are selected */}
      {selectedCount > 0 && (
        <div className="bg-primary/10 border-primary/20 flex w-screen items-center justify-between border-y px-2 py-1">
          <div className="flex items-center gap-2">
            <span className="text-primary font-medium">
              {selectedCount} event{selectedCount > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk Category Dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <button
                  className="flex cursor-pointer items-center gap-1 px-1 transition-opacity hover:opacity-80"
                  disabled={isBulkUpdateLoading}
                >
                  <Tag className="text-default-500" size={14} />
                  <span className="text-default-500 text-xs">
                    {bulkCategoryIds.size > 0
                      ? `${bulkCategoryIds.size} selected`
                      : "Set categories..."}
                  </span>
                  <ChevronDown className="text-default-400" size={12} />
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Bulk category selection"
                className="max-h-[300px] overflow-y-auto"
                closeOnSelect={false}
                selectedKeys={bulkCategoryIds}
                selectionMode="multiple"
                variant="flat"
                onSelectionChange={handleBulkCategorySelectionChange}
              >
                {categories
                  .filter(
                    (category): category is typeof category & { id: string } =>
                      category.id !== undefined,
                  )
                  .map((category) => (
                    <DropdownItem
                      key={category.id}
                      startContent={
                        <Circle
                          fill={
                            bulkCategoryIds.has(category.id)
                              ? category.color
                              : "transparent"
                          }
                          size={12}
                          stroke={category.color}
                        />
                      }
                    >
                      {category.name}
                    </DropdownItem>
                  ))}
              </DropdownMenu>
            </Dropdown>

            {/* Bulk Currency Dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <button
                  className="flex cursor-pointer items-center gap-1 px-1 transition-opacity hover:opacity-80"
                  disabled={isBulkUpdateLoading}
                >
                  <Coins className="text-default-500" size={14} />
                  <span className="text-default-500 text-xs">
                    {bulkCurrencyId
                      ? currencies.find((c) => c.id === bulkCurrencyId)
                          ?.symbol || "Set currency..."
                      : "Set currency..."}
                  </span>
                  <ChevronDown className="text-default-400" size={12} />
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Bulk currency selection"
                className="max-h-[300px] overflow-y-auto"
                selectedKeys={bulkCurrencyId ? [bulkCurrencyId] : []}
                selectionMode="single"
                variant="flat"
                onSelectionChange={handleBulkCurrencySelectionChange}
              >
                {currencies
                  .filter(
                    (currency): currency is typeof currency & { id: string } =>
                      currency.id !== undefined,
                  )
                  .map((currency) => (
                    <DropdownItem
                      key={currency.id}
                      className={
                        currency.id === bulkCurrencyId
                          ? "bg-primary/10"
                          : undefined
                      }
                      description={currency.name}
                    >
                      {currency.symbol}
                    </DropdownItem>
                  ))}
              </DropdownMenu>
            </Dropdown>

            {/* Single Apply Button */}
            <Button
              color="primary"
              isDisabled={!hasPendingChanges}
              isLoading={isBulkUpdateLoading}
              size="sm"
              startContent={
                !isBulkUpdateLoading && <CircleCheckBig size={14} />
              }
              variant="flat"
              onPress={handleApplyBulkChanges}
            >
              Apply
            </Button>
          </div>
        </div>
      )}

      {/* Table Columns */}
      <div className="text-default-900 [&>div]:border-default-300 flex w-fit items-center font-semibold [&>div]:flex [&>div]:h-[25px] [&>div]:items-center [&>div]:gap-1 [&>div]:border-[0.5px] [&>div]:p-1">
        <div className="hover:text-default-400-foreground w-[180px] cursor-pointer justify-center">
          <span>Year</span>
          <ListFilter size={12} />
        </div>
        <div className="hover:text-default-400-foreground w-[120px] cursor-pointer justify-center">
          <span>Month</span>
          <ListFilter size={12} />
        </div>
        <div className="w-[120px] justify-center">
          <span>Day</span>
        </div>
        <div className="w-[70px] justify-center">
          <Checkbox
            classNames={{ wrapper: "me-0", base: "p-0" }}
            isIndeterminate={isIndeterminate}
            isSelected={isAllSelected}
            size="sm"
            onChange={onToggleAll}
          />
        </div>
        <div className="w-[120px] justify-end">
          <span>Qty</span>
        </div>
        <div className="w-[120px] justify-end">
          <span>Amount</span>
        </div>
        <div className="w-[120px] justify-end">
          <span>Total Amount</span>
        </div>
        <div className="hover:text-default-400-foreground w-[90px] cursor-pointer">
          <span>Currency</span>
          <ListFilter size={12} />
        </div>
        <div className="w-[120px] justify-end">
          <span>Ex. Rate ({baseCurrency?.symbol || "USD"})</span>
        </div>
        <div className="w-[90px] justify-center">
          <span>Type</span>
        </div>
        <div
          className="hover:text-default-400-foreground w-[210px] cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={onToggleTextMode}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleTextMode();
            }
          }}
        >
          <span>{showOriginalText ? "Original Text" : "Description"}</span>
          <ArrowLeftRight size={12} />
        </div>
        <Dropdown>
          <DropdownTrigger>
            <div className="hover:text-default-400-foreground flex w-[180px] cursor-pointer items-center gap-1">
              <span>Categories</span>
              <ListFilter
                className={selectedCategoryIds.length > 0 ? "text-primary" : ""}
                size={12}
              />
              {selectedCategoryIds.length > 0 && (
                <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 text-[10px]">
                  {selectedCategoryIds.length}
                </span>
              )}
            </div>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Category filter"
            closeOnSelect={false}
            disabledKeys={
              selectedCategoryIds.length === 0 ? ["clear-filter"] : []
            }
            variant="flat"
          >
            {categories.length === 0 ? (
              <DropdownItem key="no-categories" isReadOnly>
                No categories available
              </DropdownItem>
            ) : (
              <>
                <DropdownItem
                  key="clear-filter"
                  className="text-default-500"
                  onPress={handleClearFilter}
                >
                  Clear filter
                </DropdownItem>
                {categories
                  .filter(
                    (category): category is typeof category & { id: string } =>
                      category.id !== undefined,
                  )
                  .map((category) => (
                    <DropdownItem
                      key={category.id}
                      startContent={
                        <Circle
                          fill={
                            selectedCategoryIds.includes(category.id)
                              ? category.color
                              : "transparent"
                          }
                          size={12}
                          stroke={category.color}
                        />
                      }
                      onPress={() => handleCategoryToggle(category.id)}
                    >
                      {category.name}
                    </DropdownItem>
                  ))}
                <DropdownItem
                  key={UNCATEGORIZED_FILTER_ID}
                  className="text-default-500"
                  startContent={
                    <CircleDashed
                      fill={
                        selectedCategoryIds.includes(UNCATEGORIZED_FILTER_ID)
                          ? "currentColor"
                          : "transparent"
                      }
                      size={12}
                    />
                  }
                  onPress={() => handleCategoryToggle(UNCATEGORIZED_FILTER_ID)}
                >
                  Uncategorized
                </DropdownItem>
              </>
            )}
          </DropdownMenu>
        </Dropdown>
        <div className="w-[120px] justify-end">
          <span>Actions</span>
        </div>
      </div>
    </nav>
  );
};
