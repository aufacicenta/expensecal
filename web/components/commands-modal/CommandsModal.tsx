"use client";

import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { useCallback, useEffect, useState } from "react";
import { CommandsModalProps } from "./CommandsModal.types";
import { EventsMultiLineInput } from "./events-multi-line-input/EventsMultiLineInput";

export const CommandsModal: React.FC<CommandsModalProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Handle keyboard shortcut (Cmd+K on Mac, Ctrl+K on Windows/Linux)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
  }, []);

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
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      size="2xl"
      scrollBehavior="inside"
      className={className}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Quick Commands
        </ModalHeader>
        <ModalBody className="pb-6">
          <EventsMultiLineInput onSubmit={handleSubmit} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
