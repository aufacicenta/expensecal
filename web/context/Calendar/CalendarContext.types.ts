import {
  CalendarEventData,
  GetCalendarResponse,
  GetCalendarSuccessResponse,
} from "@/app/api/v1/calendar/types";
import { ReactNode } from "react";

export type CalendarContextControllerProps = {
  children: ReactNode;
};

export type CalendarContextType = {
  // Existing methods
  fetchCalendar: (
    month?: string,
    range?: number,
  ) => Promise<GetCalendarResponse>;
  loadCalendar: (month?: string) => Promise<void>;

  // New cell-level update methods
  /**
   * Update events for a specific date cell
   * Merges with existing events and recalculates financial summary
   */
  updateCellEvents: (
    date: string,
    events: CalendarEventData[],
  ) => Promise<void>;

  /**
   * Set loading state for a specific date cell
   * Used to show loading indicators on individual cells
   */
  setCellLoading: (date: string, loading: boolean) => void;

  /**
   * Optimistically add an event to a cell
   * Immediately updates UI before server confirmation
   */
  optimisticAddEvent: (event: CalendarEventData) => void;

  // State properties
  calendarData: GetCalendarSuccessResponse["data"] | null;
  loading: boolean; // Initial/full calendar load state
  error: string | null;
  cellLoadingStates: Map<string, boolean>; // Individual cell loading states (date -> loading)
};
