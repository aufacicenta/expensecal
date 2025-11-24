import { EventAttributes } from "@expensecal/database/models/Event";

import { CalendarEvent } from "@/app/api/v2/calendar/types";

export type EventCellQuantityEditProps = {
  event: CalendarEvent;
  onUpdate: (
    eventId: string,
    quantity: EventAttributes["quantity"],
    eventDate: Date,
  ) => Promise<void>;
  onClose: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
  className?: string;
};
