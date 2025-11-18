import { DeleteMode } from "@/app/api/v1/events/[id]/types";

export type DeleteEventConfirmationModalProps = {
  isOpen: boolean;
  isRecurring: boolean;
  onClose: () => void;
  onConfirm: (deleteMode: DeleteMode) => void;
};
