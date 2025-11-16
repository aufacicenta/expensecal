import { CalendarData } from "@/app/api/v2/calendar/types";
import { ReactNode } from "react";

export type CalendarV2ContextControllerProps = {
  children: ReactNode;
};

export type CalendarV2ContextType = {
  /**
   * V2 calendar data structure: year -> month -> day -> events[]
   */
  calendarV2Data: CalendarData | null;

  /**
   * Currently displayed month
   */
  currentMonth: Date;

  /**
   * Loading state for calendar data
   */
  loading: boolean;

  /**
   * Error message if loading failed
   */
  error: string | null;

  /**
   * Load all calendar events from v2 endpoint
   * Returns events grouped by year/month/day
   */
  loadCalendarV2: () => Promise<void>;

  /**
   * Navigate to the previous month
   */
  goToPreviousMonth: () => void;

  /**
   * Navigate to the next month
   */
  goToNextMonth: () => void;
};
