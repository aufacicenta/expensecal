import { ReactNode } from "react";

import {
  ProcessedCalendarData,
  RawCalendarEvent,
} from "@/app/api/v2/calendar/types";

export type CalendarV2ContextControllerProps = {
  children: ReactNode;
};

export type CalendarV2ContextActionStates = {
  loadCalendarV2: {
    isLoading: boolean;
    error?: string;
  };
};

export type CalendarV2ContextType = {
  /**
   * Processed calendar data structure: year -> month -> day -> events[]
   * Built client-side from raw events + exchange rates
   */
  calendarV2Data: ProcessedCalendarData | undefined;

  /**
   * Filtered calendar data based on selected category IDs
   * Returns the original data if no categories are selected
   * Stats are recalculated to reflect only filtered events
   */
  filteredCalendarData: ProcessedCalendarData | undefined;

  /**
   * Currently displayed month
   */
  currentMonth: Date;

  /**
   * Action States for all relevant async functions
   */
  actionStates: CalendarV2ContextActionStates;

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

  /**
   * Update a single raw event by ID without reloading entire calendar
   * Used for polling updates (e.g., inventory valuation status changes)
   * @param eventId - The ID of the event to update
   * @param updatedEvent - The updated event data (partial or full)
   * @returns boolean - true if update was successful, false if event not found
   */
  updateRawEventById: (
    eventId: string,
    updatedEvent: Partial<RawCalendarEvent>,
  ) => boolean;
};
