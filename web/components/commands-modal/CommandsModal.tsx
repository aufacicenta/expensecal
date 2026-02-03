"use client";

import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { useCallback, useEffect, useState } from "react";

import { CommandsModalProps } from "./CommandsModal.types";
import { EventsMultiLineInput } from "./events-multi-line-input/EventsMultiLineInput";

export const CommandsModal: React.FC<CommandsModalProps> = ({
  className,
  isOpen: controlledIsOpen,
  onOpenChange,
  eventGroupId,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setIsOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const newValue = typeof value === "function" ? value(isOpen) : value;

      if (onOpenChange) {
        onOpenChange(newValue);
      }
      if (!isControlled) {
        setInternalIsOpen(newValue);
      }
    },
    [isControlled, isOpen, onOpenChange],
  );

  // Handle keyboard shortcut (Cmd+K on Mac, Ctrl+K on Windows/Linux)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
      const shortcutKey = isMac ? e.metaKey : e.ctrlKey;

      if (shortcutKey && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      // Close modal with Escape key
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [setIsOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = () => {
    handleClose();
  };

  return (
    <Modal
      className={className}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="2xl"
      onOpenChange={setIsOpen}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Quick Commands
        </ModalHeader>
        <ModalBody className="pb-6">
          <EventsMultiLineInput
            eventGroupId={eventGroupId}
            onSubmit={handleSubmit}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
