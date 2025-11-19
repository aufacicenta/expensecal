import { toDateString } from "@/lib/date";
import { Button } from "@heroui/button";
import { DatePicker } from "@heroui/date-picker";
import { CalendarDate, parseDate } from "@internationalized/date";
import clsx from "clsx";
import { CircleCheckBig, CircleX } from "lucide-react";
import { useState } from "react";
import { EventCellDateEditProps } from "./EventCellDateEdit.types";

export const EventCellDateEdit: React.FC<EventCellDateEditProps> = ({
  event,
  onUpdate,
  onClose,
  className,
}) => {
  const initialDate = event.event_date
    ? parseDate(toDateString(event.event_date))
    : parseDate(toDateString(new Date()));
  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(
    initialDate,
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      if (!event.id) {
        console.error("Event ID is missing");
        return;
      }
      if (!selectedDate) {
        console.error("Date is missing");
        return;
      }
      await onUpdate(
        event.id,
        selectedDate?.toDate("UTC"),
        initialDate.toDate("UTC"),
      );
      onClose();
    } catch (error) {
      console.error("Failed to update event date:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={clsx("space-y-2", className)}>
      <DatePicker
        value={selectedDate}
        onChange={setSelectedDate}
        isDisabled={isLoading}
        size="sm"
        variant="bordered"
        label="Select new date"
      />
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          onPress={onClose}
          isDisabled={isLoading}
          variant="bordered"
          isIconOnly
        >
          <CircleX size={16} />
        </Button>
        <Button
          size="sm"
          color="primary"
          onPress={handleConfirm}
          isLoading={isLoading}
          variant="bordered"
          isIconOnly
        >
          <CircleCheckBig size={16} />
        </Button>
      </div>
    </div>
  );
};
