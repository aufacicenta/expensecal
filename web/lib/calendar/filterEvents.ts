/**
 * Calendar event filtering utilities
 * Filters CalendarEventData by category IDs
 */

import { CalendarEventData } from "@/app/api/v1/calendar/types";

/**
 * Special ID used to filter events that have no categories assigned
 */
export const UNCATEGORIZED_FILTER_ID = "__uncategorized__";

/**
 * Filter events by category IDs
 * @param events - Array of events to filter
 * @param selectedCategoryIds - Array of category IDs to filter by (can include UNCATEGORIZED_FILTER_ID)
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

  const includeUncategorized = selectedCategoryIds.includes(
    UNCATEGORIZED_FILTER_ID,
  );
  const categoryIdsWithoutUncategorized = selectedCategoryIds.filter(
    (id) => id !== UNCATEGORIZED_FILTER_ID,
  );

  // Filter events that have at least one matching category or are uncategorized
  return events.filter((event) => {
    const hasNoCategories = !event.categories || event.categories.length === 0;

    // If event has no categories, include it only if uncategorized filter is selected
    if (hasNoCategories) {
      return includeUncategorized;
    }

    // If no regular categories are selected (only uncategorized), skip categorized events
    if (categoryIdsWithoutUncategorized.length === 0) {
      return false;
    }

    // Check if any of the event's categories match the selected ones
    return event.categories!.some((category) =>
      categoryIdsWithoutUncategorized.includes(category.id),
    );
  });
};
