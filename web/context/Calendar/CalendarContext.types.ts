import { ReactNode } from "react";
import { GetCalendarResponse } from "@/app/api/v1/calendar/types";

export type CalendarContextControllerProps = {
  children: ReactNode;
};

export type CalendarContextType = {
  fetchCalendar: (month?: string, range?: number) => Promise<GetCalendarResponse>;
};
