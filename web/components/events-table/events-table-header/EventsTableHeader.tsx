import { Checkbox } from "@heroui/checkbox";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { ArrowLeftRight, Circle, ListFilter } from "lucide-react";

import { EventsTableHeaderProps } from "./EventsTableHeader.types";

import { ThemeSwitch } from "@/components/theme-switch";

export const EventsTableHeader: React.FC<EventsTableHeaderProps> = ({
  selectedCount,
  totalCount,
  showOriginalText,
  onToggleAll,
  onToggleTextMode,
  categories,
  selectedCategoryIds,
  onCategoryFilterChange,
}) => {
  const isAllSelected = selectedCount > 0 && selectedCount === totalCount;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;

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
        <div className="text-right">
          <ThemeSwitch />
        </div>
      </div>

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
          <span>Ex. Rate (USD)</span>
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
                  isDisabled={selectedCategoryIds.length === 0}
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
