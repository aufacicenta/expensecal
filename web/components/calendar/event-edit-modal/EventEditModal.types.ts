import { CalendarEventData } from "@/app/api/v1/calendar/types";

export type OpenEventModal = {
  id: string;
  event: CalendarEventData;
  parentModalId?: string; // For nested child event modals
};

export type EventEditModalContextType = {
  modals: OpenEventModal[];
  openModal: (event: CalendarEventData, parentModalId?: string) => void;
  closeModal: (modalId: string) => void;
};

export type EventEditModalProps = {
  modalId: string;
  event: CalendarEventData;
  isOpen: boolean;
  onClose: () => void;
};

export type EditableEventField =
  | "amount"
  | "quantity"
  | "currency"
  | "description"
  | "date";
