import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import clsx from "clsx";
import { CircleCheckBig, CircleX, Plus } from "lucide-react";
import { useState } from "react";

import { EventCellCategoriesSelectProps } from "./EventCellCategoriesSelect.types";

import { EventCategoriesCreateModal } from "@/components/event-categories-create-modal/EventCategoriesCreateModal";

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
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    <div className={clsx("space-y-2", className)}>
      <Select
        isMultiline
        classNames={{
          trigger: "min-h-12",
          listboxWrapper: "max-h-48",
        }}
        isDisabled={isLoading}
        placeholder="Select categories"
        selectedKeys={selectedCategoryIds}
        selectionMode="multiple"
        size="sm"
        startContent={null}
        variant="bordered"
        onSelectionChange={handleSelectionChange}
      >
        {availableCategories.map((category) => (
          <SelectItem
            key={category.id}
            className="flex items-center gap-2"
            textValue={category.name}
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
      <div className="flex justify-between gap-2">
        <div>
          <Button
            isIconOnly
            isDisabled={isLoading}
            size="sm"
            title="Add new category"
            variant="bordered"
            onPress={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            isIconOnly
            isDisabled={isLoading}
            size="sm"
            variant="bordered"
            onPress={onClose}
          >
            <CircleX size={16} />
          </Button>
          <Button
            isIconOnly
            color="primary"
            isLoading={isLoading}
            size="sm"
            variant="bordered"
            onPress={handleConfirm}
          >
            <CircleCheckBig size={16} />
          </Button>
        </div>
      </div>

      {/* Create Category Modal */}
      <EventCategoriesCreateModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
};
