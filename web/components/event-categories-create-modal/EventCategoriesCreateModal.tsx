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
import { useState } from "react";
import { EventCategoriesCreateModalProps } from "./EventCategoriesCreateModal.types";

export const EventCategoriesCreateModal: React.FC<
  EventCategoriesCreateModalProps
> = ({ isOpen, onOpenChange }) => {
  const { createCategory } = useEventCategoriesContext();

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
      onOpenChange(false);
    } else {
      setError("Failed to create category. Please try again.");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setFormData({
        name: "",
        description: "",
        color: "#3B82F6",
      });
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Create New Category
        </ModalHeader>
        <ModalBody>
          <Input
            label="Category Name"
            placeholder="e.g., Groceries"
            value={formData.name}
            onValueChange={(value) => setFormData({ ...formData, name: value })}
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
            onPress={() => handleOpenChange(false)}
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
  );
};
