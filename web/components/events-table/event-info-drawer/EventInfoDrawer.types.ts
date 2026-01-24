import {
  CalendarEvent,
  ProcessedCalendarData,
} from "@/app/api/v2/calendar/types";

export type EventInfoDrawerProps = {
  event: CalendarEvent | null;
  calendarV2Data: ProcessedCalendarData;
  isOpen: boolean;
  onClose: () => void;
};
