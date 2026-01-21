import { CalendarEvent } from "@/app/api/v2/calendar/types";

export type ChildEventsPanelProps = {
  parentEvent: CalendarEvent;
  childEvents: CalendarEvent[];
  className?: string;
};
