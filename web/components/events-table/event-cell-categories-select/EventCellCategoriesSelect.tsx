import { EventCategoriesCreateModal } from "@/components/event-categories-create-modal/EventCategoriesCreateModal";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import clsx from "clsx";
import { CircleCheckBig, CircleX, Plus } from "lucide-react";
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
      <div className="flex justify-between gap-2">
        <div>
          <Button
            size="sm"
            onPress={() => setIsModalOpen(true)}
            isDisabled={isLoading}
            variant="bordered"
            isIconOnly
            title="Add new category"
          >
            <Plus size={16} />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            onPress={onClose}
            isDisabled={isLoading}
            variant="bordered"
            isIconOnly
          >
            <CircleX size={16} />
          </Button>
          <Button
            size="sm"
            color="primary"
            onPress={handleConfirm}
            isLoading={isLoading}
            variant="bordered"
            isIconOnly
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
