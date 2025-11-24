"use client";

import { Chip } from "@heroui/chip";

import { CalendarEventCellProps } from "./CalendarEventCell.types";

import { useEventEditModalContext } from "@/context/EventEditModal/EventEditModalContext";

export const CalendarEventCell: React.FC<CalendarEventCellProps> = ({
  event,
}) => {
  const { openModal } = useEventEditModalContext();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openModal(event);
  };

  return (
    <div>
      <button
        className="w-full cursor-pointer text-left transition-opacity hover:opacity-80"
        onClick={handleClick}
      >
        <Chip
          color={event.type === "EXPENSE" ? "danger" : "success"}
          size="sm"
          variant="dot"
        >
          {event.quantity}x {event.currency?.symbol}{" "}
          {Number(event.amount).toFixed(2)} {event.description}
        </Chip>
      </button>
    </div>
  );
};
