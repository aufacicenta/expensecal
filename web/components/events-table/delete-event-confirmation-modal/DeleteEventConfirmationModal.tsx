import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { DeleteEventConfirmationModalProps } from "./DeleteEventConfirmationModal.types";

export const DeleteEventConfirmationModal: React.FC<
  DeleteEventConfirmationModalProps
> = ({
  isOpen,
  isRecurring,
  isMultiple,
  multipleCount,
  onClose,
  onConfirm,
}) => {
  const handleDeleteSingle = () => {
    onConfirm("single");
    onClose();
  };

  const handleDeleteAllFuture = () => {
    onConfirm("all-future");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {isMultiple ? "Delete Multiple Events" : "Delete Event"}
        </ModalHeader>
        <ModalBody>
          <p>
            {isMultiple
              ? `Are you sure you want to delete ${multipleCount} selected events?`
              : isRecurring
                ? "This is a recurring event. What would you like to delete?"
                : "Are you sure you want to delete this event?"}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            color="danger"
            variant="bordered"
            onPress={handleDeleteSingle}
          >
            {isMultiple
              ? `Delete All ${multipleCount} Events`
              : isRecurring
                ? "Delete this event only"
                : "Delete"}
          </Button>
          {isRecurring && !isMultiple && (
            <Button
              color="danger"
              variant="bordered"
              onPress={handleDeleteAllFuture}
            >
              Delete this and all its ocurrences
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
