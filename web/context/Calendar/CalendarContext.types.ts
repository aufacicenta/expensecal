import {
  GetCalendarResponse,
  GetCalendarSuccessResponse,
} from "@/app/api/v1/calendar/types";
import { ReactNode } from "react";

export type CalendarContextControllerProps = {
  children: ReactNode;
};

export type CalendarContextType = {
  fetchCalendar: (
    month?: string,
    range?: number,
  ) => Promise<GetCalendarResponse>;
  loadCalendar: (month?: string) => Promise<void>;
  calendarData: GetCalendarSuccessResponse["data"] | null;
  loading: boolean;
  error: string | null;
};
