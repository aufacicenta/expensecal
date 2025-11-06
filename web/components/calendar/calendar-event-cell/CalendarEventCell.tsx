import clsx from "clsx";
import { CalendarEventCellProps } from "./CalendarEventCell.types";
import { Chip } from "@heroui/chip";
import { divider } from "@heroui/theme";

export const CalendarEventCell: React.FC<CalendarEventCellProps> = ({
  className,
  event,
}) => {
  return (
    <div>
      <Chip
        variant="dot"
        color={event.type === "EXPENSE" ? "danger" : "success"}
        size="sm"
      >
        {event.currency?.symbol} {Number(event.amount).toFixed(2)}{" "}
        {event.description}
      </Chip>
    </div>
  );
};
