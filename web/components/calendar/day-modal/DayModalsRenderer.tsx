"use client";

import { useDayModalContext } from "@/context/DayModal/useDayModalContext";
import { DayModal } from "./DayModal";

export const DayModalsRenderer: React.FC = () => {
  const { modals, closeModal } = useDayModalContext();

  return (
    <>
      {modals.map((modal) => (
        <DayModal
          key={modal.id}
          day={modal.day}
          position={modal.position}
          onClose={() => closeModal(modal.id)}
        />
      ))}
    </>
  );
};
