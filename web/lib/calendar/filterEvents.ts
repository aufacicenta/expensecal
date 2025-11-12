/**
 * Calendar event filtering utilities
 * Filters CalendarEventData by category IDs
 */

import { CalendarEventData } from "@/app/api/v1/calendar/types";

/**
 * Filter events by category IDs
 * @param events - Array of events to filter
 * @param selectedCategoryIds - Array of category IDs to filter by
 * @returns Filtered events if categories are selected, otherwise returns all events
 */
export const filterEventsByCategories = (
  events: CalendarEventData[],
  selectedCategoryIds: string[],
): CalendarEventData[] => {
  // If no categories are selected, show all events
  if (selectedCategoryIds.length === 0) {
    return events;
  }

  // Filter events that have at least one matching category
  return events.filter((event) => {
    // Events may not have categories, treat as having no categories
    if (!event.categories || event.categories.length === 0) {
      return false;
    }

    // Check if any of the event's categories match the selected ones
    return event.categories.some((category) =>
      selectedCategoryIds.includes(category.id),
    );
  });
};
