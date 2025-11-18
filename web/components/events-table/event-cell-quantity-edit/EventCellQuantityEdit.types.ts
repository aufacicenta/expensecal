import { CalendarEvent } from "@/app/api/v2/calendar/types";

export type EventCellQuantityEditProps = {
  event: CalendarEvent;
  onUpdate: (
    eventId: string,
    quantity: number,
    eventDate: Date,
  ) => Promise<void>;
  onClose: () => void;
  className?: string;
};
