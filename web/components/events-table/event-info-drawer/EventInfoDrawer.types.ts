import { RawCalendarEvent } from "@/app/api/v2/calendar/types";
import {
  CalendarEvent,
  ProcessedCalendarData,
} from "@/app/api/v2/calendar/types";

export type EventInfoDrawerProps = {
  event: CalendarEvent | null;
  calendarV2Data: ProcessedCalendarData;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Function to fetch a single event by ID
   * Used to refresh PENDING/IN_PROGRESS events when drawer opens
   */
  onRefreshEvent?: (eventId: string) => Promise<RawCalendarEvent | null>;
};
