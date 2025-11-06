import { CalendarEventData } from "@/app/api/v1/calendar/types";
import { ReactNode } from "react";

export type CalendarEventCellProps = {
  event: CalendarEventData;
  children?: ReactNode;
  className?: string;
};
