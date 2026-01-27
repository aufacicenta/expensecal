"use client";

import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { addToast } from "@heroui/toast";
import { useState } from "react";

import { CreateViewModalProps } from "./CreateViewModal.types";

import { useEventGroupsContext } from "@/context/EventGroups/useEventGroupsContext";
import { formatDateForDisplay } from "@/lib/date";

const generateDefaultViewName = () => {
  const now = new Date();
  const dateStr = formatDateForDisplay(now);
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `View ${dateStr} ${timeStr}`;
};

export const CreateViewModal: React.FC<CreateViewModalProps> = ({
  isOpen,
  selectedEventIds,
  onClose,
  onSuccess,
}) => {
  const { createEventGroup } = useEventGroupsContext();
  const [viewName, setViewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    const nameToUse = viewName.trim() || generateDefaultViewName();

    setIsLoading(true);

    try {
      const result = await createEventGroup(nameToUse, selectedEventIds);

      if (result) {
        addToast({
          title: "View Created",
          description: `"${nameToUse}" created with ${selectedEventIds.length} event${selectedEventIds.length !== 1 ? "s" : ""}`,
          color: "success",
        });
        setViewName("");
        onSuccess(result.id);
        onClose();
      } else {
        addToast({
          title: "Error",
          description: "Failed to create view",
          color: "danger",
        });
      }
    } catch (error) {
      console.error("Failed to create view:", error);
      addToast({
        title: "Error",
        description: "Failed to create view",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setViewName("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} size="md" onClose={handleClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">Create View</ModalHeader>
        <ModalBody>
          <p className="text-default-500 mb-4 text-sm">
            Create a view from the {selectedEventIds.length} selected event
            {selectedEventIds.length !== 1 ? "s" : ""}. Views allow you to save
            and access specific groups of events.
          </p>
          <Input
            label="View Name"
            placeholder="Leave empty for auto-generated name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) {
                handleCreate();
              }
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancel
          </Button>
          <Button color="primary" isLoading={isLoading} onPress={handleCreate}>
            Create View
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
