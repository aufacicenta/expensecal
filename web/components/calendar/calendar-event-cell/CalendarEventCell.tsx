"use client";

import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";

import { CalendarEventCellProps } from "./CalendarEventCell.types";

import { useEventEditModalContext } from "@/context/EventEditModal/EventEditModalContext";

export const CalendarEventCell: React.FC<CalendarEventCellProps> = ({
  event,
}) => {
  const { openModal } = useEventEditModalContext();

  const handleClick = () => {
    openModal(event);
  };

  return (
    <div>
      <Button
        className="h-auto w-full justify-start p-0 text-left"
        size="sm"
        variant="light"
        onPress={handleClick}
      >
        <Chip
          color={event.type === "EXPENSE" ? "danger" : "success"}
          size="sm"
          variant="dot"
        >
          {event.quantity}x {event.currency?.symbol}{" "}
          {Number(event.amount).toFixed(2)} {event.description}
        </Chip>
      </Button>
    </div>
  );
};
