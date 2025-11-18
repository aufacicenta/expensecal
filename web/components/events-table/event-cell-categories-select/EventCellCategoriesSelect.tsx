import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import clsx from "clsx";
import { useState } from "react";
import { EventCellCategoriesSelectProps } from "./EventCellCategoriesSelect.types";

export const EventCellCategoriesSelect: React.FC<
  EventCellCategoriesSelectProps
> = ({ event, availableCategories, onUpdate, onClose, className }) => {
  const initialIds =
    event.categories
      ?.map((cat) => cat.id)
      .filter((id): id is string => Boolean(id)) || [];
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set(initialIds),
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectionChange = (newSelection: "all" | Set<React.Key>) => {
    const selectedSet: Set<string> =
      newSelection === "all"
        ? new Set(
            availableCategories
              .map((cat) => cat.id)
              .filter((id): id is string => Boolean(id)),
          )
        : new Set(
            Array.from(newSelection as Set<React.Key>)
              .map((id) => String(id))
              .filter((id): id is string => Boolean(id)),
          );

    setSelectedCategoryIds(selectedSet);
  };

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      const categoryIds = Array.from(selectedCategoryIds);
      if (!event.id) {
        console.error("Event ID is missing");
        return;
      }
      await onUpdate(event.id, categoryIds);
      onClose();
    } catch (error) {
      console.error("Failed to update event categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={clsx(
        "border-content2 bg-background absolute top-full right-0 left-0 z-50 w-full space-y-2 rounded-md border p-2 shadow-lg",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Select
        isMultiline
        selectionMode="multiple"
        placeholder="Select categories"
        selectedKeys={selectedCategoryIds}
        onSelectionChange={handleSelectionChange}
        isDisabled={isLoading}
        size="sm"
        variant="bordered"
        classNames={{
          trigger: "min-h-12",
          listboxWrapper: "max-h-48",
        }}
        startContent={null}
      >
        {availableCategories.map((category) => (
          <SelectItem
            key={category.id}
            textValue={category.name}
            className="flex items-center gap-2"
          >
            <div className="flex w-full items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span>{category.name}</span>
            </div>
          </SelectItem>
        ))}
      </Select>
      <div className="flex gap-2">
        <Button
          size="sm"
          color="primary"
          onPress={handleConfirm}
          isLoading={isLoading}
          className="flex-1"
          variant="bordered"
        >
          Confirm
        </Button>
        <Button
          size="sm"
          onPress={onClose}
          isDisabled={isLoading}
          className="flex-1"
          variant="bordered"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
