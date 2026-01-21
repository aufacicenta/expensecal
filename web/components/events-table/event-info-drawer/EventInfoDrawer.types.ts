import {
  CalendarEvent,
  GetCalendarV2SuccessResponse,
} from "@/app/api/v2/calendar/types";

export type EventInfoDrawerProps = {
  event: CalendarEvent | null;
  calendarV2Data: GetCalendarV2SuccessResponse["data"];
  isOpen: boolean;
  onClose: () => void;
};
