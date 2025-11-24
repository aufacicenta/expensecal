"use client";

import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { useState } from "react";

import { EventCategoriesProps } from "./EventCategories.types";

import { useEventCategoriesContext } from "@/context/EventCategories/useEventCategoriesContext";
import { EventCategoriesCreateModal } from "@/components/event-categories-create-modal/EventCategoriesCreateModal";

export const EventCategories: React.FC<EventCategoriesProps> = ({
  className,
  selectedIds,
  onSelectionChange,
}) => {
  const {
    categories,
    selectedCategoryIds: contextSelectedIds,
    setSelectedCategoryIds: contextSetSelectedIds,
    loading,
  } = useEventCategoriesContext();

  // Use provided props if available, otherwise fall back to context
  const selectedCategoryIds = selectedIds ?? contextSelectedIds;
  const setSelectedCategoryIds = onSelectionChange ?? contextSetSelectedIds;

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      {/* Categories Select */}
      <Select
        // label="Categories"
        className="w-48"
        classNames={{
          trigger: "min-h-10",
        }}
        isDisabled={loading}
        placeholder="Select categories"
        renderValue={(items) => (
          <div className="bg-content2 flex flex-wrap rounded p-1">
            {items.map((item) => {
              const category = categories.find((cat) => cat.id === item.key);

              return (
                <div
                  key={item.key}
                  className="text-xxs mr-1 flex h-3 items-center gap-1"
                >
                  <div
                    className="h-1 w-1 rounded"
                    style={{ backgroundColor: category?.color }}
                  />
                  <span>{category?.name}</span>
                </div>
              );
            })}
          </div>
        )}
        selectedKeys={selectedCategoryIds}
        selectionMode="multiple"
        onSelectionChange={(keys) =>
          setSelectedCategoryIds(Array.from(keys as Set<string>))
        }
      >
        {categories.map((category) => (
          <SelectItem key={category.id}>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </div>
          </SelectItem>
        ))}
      </Select>

      {/* Create Category Button */}
      <Button
        isIconOnly
        className="p-1"
        title="Create new category"
        variant="light"
        onPress={() => setIsModalOpen(true)}
      >
        <Plus size={18} />
      </Button>

      {/* Create Category Modal */}
      <EventCategoriesCreateModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
};
