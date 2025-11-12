"use client";

import { useEventEditModalContext } from "@/context/EventEditModal/EventEditModalContext";
import { EventEditModal } from "./EventEditModal";

export const EventEditModalRenderer: React.FC = () => {
  const { modals, closeModal } = useEventEditModalContext();

  return (
    <>
      {modals.map((modal) => (
        <EventEditModal
          key={modal.id}
          modalId={modal.id}
          event={modal.event}
          isOpen={true}
          onClose={() => closeModal(modal.id)}
        />
      ))}
    </>
  );
};
