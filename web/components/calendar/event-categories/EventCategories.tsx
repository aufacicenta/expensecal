"use client";

import { useEventCategoriesContext } from "@/context/EventCategories/useEventCategoriesContext";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { useState } from "react";
import { EventCategoriesProps } from "./EventCategories.types";

export const EventCategories: React.FC<EventCategoriesProps> = ({
  className,
}) => {
  const {
    categories,
    selectedCategoryIds,
    setSelectedCategoryIds,
    createCategory,
    loading,
  } = useEventCategoriesContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6", // Default blue color
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCategory = async () => {
    // Validate name
    if (!formData.name.trim()) {
      setError("Category name is required");
      return;
    }

    // Validate color format
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(formData.color)) {
      setError("Please enter a valid hex color (e.g., #FF5733)");
      return;
    }

    setIsCreating(true);
    setError(null);

    const result = await createCategory(
      formData.name,
      formData.color,
      formData.description || undefined,
    );

    setIsCreating(false);

    if (result) {
      // Reset form and close modal
      setFormData({
        name: "",
        description: "",
        color: "#3B82F6",
      });
      setIsModalOpen(false);
    } else {
      setError("Failed to create category. Please try again.");
    }
  };

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      {/* Categories Select */}
      <Select
        label="Categories"
        placeholder="Select categories"
        selectedKeys={selectedCategoryIds}
        onSelectionChange={(keys) =>
          setSelectedCategoryIds(Array.from(keys as Set<string>))
        }
        selectionMode="multiple"
        isDisabled={loading}
        className="w-48"
        classNames={{
          trigger: "min-h-10",
        }}
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
        variant="light"
        onPress={() => setIsModalOpen(true)}
        className="p-1"
        title="Create new category"
      >
        <Plus size={18} />
      </Button>

      {/* Create Category Modal */}
      <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Create New Category
          </ModalHeader>
          <ModalBody>
            <Input
              label="Category Name"
              placeholder="e.g., Groceries"
              value={formData.name}
              onValueChange={(value) =>
                setFormData({ ...formData, name: value })
              }
              isDisabled={isCreating}
            />

            <Textarea
              label="Description (Optional)"
              placeholder="Add a description for this category"
              value={formData.description}
              onValueChange={(value) =>
                setFormData({ ...formData, description: value })
              }
              minRows={2}
              isDisabled={isCreating}
            />

            <div className="flex items-center gap-3">
              <Input
                label="Color"
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                isDisabled={isCreating}
                className="w-20"
                startContent={
                  <div
                    className="h-6 w-6 rounded border"
                    style={{ backgroundColor: formData.color }}
                  />
                }
              />
              <Input
                label="Hex Code"
                placeholder="#FF5733"
                value={formData.color}
                onValueChange={(value) => {
                  // Validate and update hex color
                  const hexColorRegex = /^#?[0-9A-Fa-f]{0,6}$/;
                  if (hexColorRegex.test(value)) {
                    setFormData({
                      ...formData,
                      color: value.startsWith("#") ? value : `#${value}`,
                    });
                  }
                }}
                isDisabled={isCreating}
                className="flex-1"
              />
            </div>

            {error && <div className="text-danger text-sm">{error}</div>}
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onPress={() => setIsModalOpen(false)}
              isDisabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleCreateCategory}
              isLoading={isCreating}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
