import { GetCalendarV2SuccessResponse } from "@/app/api/v2/calendar/types";
import { ReactNode } from "react";

export type CalendarV2ContextControllerProps = {
  children: ReactNode;
};

export type CalendarV2ContextType = {
  /**
   * V2 calendar data structure: year -> month -> day -> events[]
   */
  calendarV2Data: GetCalendarV2SuccessResponse["data"] | undefined;

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
   * Update a calendar event in-place without reloading entire calendar
   * Handles event property updates, date changes, and stats recalculation
   * @param updatedEvent - The event with updated properties
   * @param oldEventDate - The original event date (before update, if date changed)
   * @returns boolean - true if update was successful, false if event not found
   */
  updateCalendarCellEvent: (updatedEvent: any, oldEventDate: Date) => boolean;

  /**
   * Remove a deleted event from the calendar and recalculate stats
   * Handles deletion and applies carry-forward cascade for all subsequent periods
   * @param deletedEvent - The event that was deleted (with its properties)
   * @param eventDate - The date of the deleted event
   * @returns boolean - true if deletion was successful, false if event not found
   */
  deleteCalendarCellEvent: (deletedEvent: any, eventDate: Date) => boolean;

  /**
   * Navigate to the previous month
   */
  goToPreviousMonth: () => void;

  /**
   * Navigate to the next month
   */
  goToNextMonth: () => void;

  /**
   * Navigate to a specific month
   */
  goToMonth: (date: Date) => void;
};
