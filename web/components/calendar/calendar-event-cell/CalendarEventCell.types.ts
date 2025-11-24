import { ReactNode } from "react";

import { CalendarEventData } from "@/app/api/v1/calendar/types";

export type CalendarEventCellProps = {
  event: CalendarEventData;
  children?: ReactNode;
  className?: string;
};
