import { CalendarEvent } from "@/app/api/v2/calendar/types";
import { EventAttributes } from "@expensecal/database/models/Event";

export type EventCellAmountEditProps = {
  event: CalendarEvent;
  onUpdate: (
    eventId: string,
    amount: EventAttributes["amount"],
    eventDate: Date,
  ) => Promise<void>;
  onClose: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
  className?: string;
};
