"use client";

import { useEventEditModalContext } from "@/context/EventEditModal/EventEditModalContext";
import { Chip } from "@heroui/chip";
import { CalendarEventCellProps } from "./CalendarEventCell.types";

export const CalendarEventCell: React.FC<CalendarEventCellProps> = ({
  className,
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
        onClick={handleClick}
        className="w-full cursor-pointer text-left transition-opacity hover:opacity-80"
      >
        <Chip
          variant="dot"
          color={event.type === "EXPENSE" ? "danger" : "success"}
          size="sm"
        >
          {event.quantity}x {event.currency?.symbol}{" "}
          {Number(event.amount).toFixed(2)} {event.description}
        </Chip>
      </button>
    </div>
  );
};
