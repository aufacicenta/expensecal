"use client";

import { createContext, ReactNode, useCallback, useState } from "react";

import { CalendarDay } from "@/app/api/v1/calendar/types";
import {
  DayModalContextType,
  OpenModal,
} from "@/components/calendar/day-modal/DayModal.types";

export const DayModalContext = createContext<DayModalContextType | null>(null);

export const DayModalContextController: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [modals, setModals] = useState<OpenModal[]>([]);

  const openModal = useCallback(
    (day: CalendarDay, position?: { x: number; y: number }) => {
      // Check if a modal for this day already exists
      setModals((prev) => {
        const existingModal = prev.find((m) => m.day.date === day.date);

        // If a modal for this day exists, just return without adding a new one
        if (existingModal) {
          return prev;
        }

        const modalId = `modal-${day.date}-${Date.now()}`;
        // Use provided position, default to center if not provided
        const newPosition = position || {
          x: window.innerWidth / 2 - 160,
          y: 100,
        };

        return [
          ...prev,
          {
            id: modalId,
            day,
            position: newPosition,
          },
        ];
      });
    },
    [],
  );

  const closeModal = useCallback((modalId: string) => {
    setModals((prev) => prev.filter((modal) => modal.id !== modalId));
  }, []);

  const updateModalPosition = useCallback(
    (modalId: string, position: { x: number; y: number }) => {
      setModals((prev) =>
        prev.map((modal) =>
          modal.id === modalId ? { ...modal, position } : modal,
        ),
      );
    },
    [],
  );

  const value: DayModalContextType = {
    modals,
    openModal,
    closeModal,
    updateModalPosition,
  };

  return (
    <DayModalContext.Provider value={value}>
      {children}
    </DayModalContext.Provider>
  );
};
