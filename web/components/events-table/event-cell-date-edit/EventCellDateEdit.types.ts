import { CalendarEvent } from "@/app/api/v2/calendar/types";

export type EventCellDateEditProps = {
  event: CalendarEvent;
  onUpdate: (eventId: string, newDate: Date, oldDate: Date) => Promise<void>;
  onClose: () => void;
  className?: string;
};
