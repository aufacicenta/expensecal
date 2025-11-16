import { EventAttributes } from "@expensecal/database/models/Event";
import { BaseErrorResponse, BaseSuccessResponse } from "../../v1/types";

type CalendarEvent = EventAttributes;

type Day = Array<CalendarEvent>;
type Month = Record<string, Day>;
type Year = Record<string, Month>;
export type CalendarData = Record<string, Year>;

export type GetCalendarSuccessResponse = {
  data: CalendarData;
} & BaseSuccessResponse;

export type GetCalendarErrorResponse = {
  details?: string;
  stage?: "validation" | "database" | "calculation"; // Which stage failed
} & BaseErrorResponse;

export type GetCalendarResponse =
  | GetCalendarSuccessResponse
  | GetCalendarErrorResponse;
