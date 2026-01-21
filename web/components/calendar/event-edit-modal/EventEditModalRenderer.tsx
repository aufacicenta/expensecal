"use client";

import { EventEditModal } from "./EventEditModal";

import { useEventEditModalContext } from "@/context/EventEditModal/EventEditModalContext";

export const EventEditModalRenderer: React.FC = () => {
  const { modals, closeModal } = useEventEditModalContext();

  return (
    <>
      {modals.map((modal) => (
        <EventEditModal
          key={modal.id}
          event={modal.event}
          isOpen={true}
          modalId={modal.id}
          onClose={() => closeModal(modal.id)}
        />
      ))}
    </>
  );
};
