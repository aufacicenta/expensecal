"use client";

import { CalendarEventData } from "@/app/api/v1/calendar/types";
import {
  EventEditModalContextType,
  OpenEventModal,
} from "@/components/calendar/event-edit-modal/EventEditModal.types";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

export const EventEditModalContext =
  createContext<EventEditModalContextType | null>(null);

export const EventEditModalContextController: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [modals, setModals] = useState<OpenEventModal[]>([]);

  const openModal = useCallback(
    (event: CalendarEventData, parentModalId?: string) => {
      const modalId = `event-modal-${event.id}-${Date.now()}`;

      setModals((prev) => [
        ...prev,
        {
          id: modalId,
          event,
          parentModalId,
        },
      ]);
    },
    [],
  );

  const closeModal = useCallback((modalId: string) => {
    setModals((prev) => prev.filter((modal) => modal.id !== modalId));
  }, []);

  const value: EventEditModalContextType = {
    modals,
    openModal,
    closeModal,
  };

  return (
    <EventEditModalContext.Provider value={value}>
      {children}
    </EventEditModalContext.Provider>
  );
};

export const useEventEditModalContext = (): EventEditModalContextType => {
  const context = useContext(EventEditModalContext);
  if (!context) {
    throw new Error(
      "useEventEditModalContext must be used within EventEditModalContextController",
    );
  }
  return context;
};
