import { ReactNode } from "react";

import { CalendarDay } from "@/app/api/v1/calendar/types";

export type DayModalProps = {
  day: CalendarDay;
  position?: { x: number; y: number };
  onClose?: () => void;
  children?: ReactNode;
  className?: string;
};

export type OpenModal = {
  id: string; // unique identifier for this modal instance
  day: CalendarDay;
  position: { x: number; y: number };
};

export type DayModalContextType = {
  modals: OpenModal[];
  openModal: (day: CalendarDay, position?: { x: number; y: number }) => void;
  closeModal: (modalId: string) => void;
  updateModalPosition: (
    modalId: string,
    position: { x: number; y: number },
  ) => void;
};
