import { DeleteMode } from "@/app/api/v1/events/[id]/types";

export type DeleteEventConfirmationModalProps = {
  isOpen: boolean;
  isRecurring: boolean;
  isMultiple?: boolean;
  multipleCount?: number;
  onClose: () => void;
  onConfirm: (deleteMode: DeleteMode) => void;
};
