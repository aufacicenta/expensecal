import { useState, useCallback } from "react";

import {
  CalendarEvent,
  GetCalendarV2SuccessResponse,
} from "@/app/api/v2/calendar/types";

type UseEventSelectionParams = {
  calendarV2Data: GetCalendarV2SuccessResponse["data"] | undefined;
};

export const useEventSelection = ({
  calendarV2Data,
}: UseEventSelectionParams) => {
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    new Set(),
  );

  const getAllEventIds = useCallback((): string[] => {
    if (!calendarV2Data?.calendar) return [];

    return Object.values(calendarV2Data.calendar)
      .flatMap((yearObj) =>
        Object.values(yearObj).flatMap((monthObj) =>
          Object.values(monthObj).flatMap((events) =>
            events.map((event) => event.id),
          ),
        ),
      )
      .filter((id): id is string => id !== undefined);
  }, [calendarV2Data]);

  const handleToggleEventSelection = useCallback((eventId: string) => {
    setSelectedEventIds((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }

      return newSet;
    });
  }, []);

  const handleToggleDaySelection = useCallback((events: CalendarEvent[]) => {
    const dayEventIds = events
      .map((event) => event.id)
      .filter((id): id is string => id !== undefined);

    setSelectedEventIds((prev) => {
      const newSet = new Set(prev);
      const allDayEventsSelected = dayEventIds.every((id) => newSet.has(id));

      if (allDayEventsSelected) {
        // Deselect all events in this day
        dayEventIds.forEach((id) => newSet.delete(id));
      } else {
        // Select all events in this day
        dayEventIds.forEach((id) => newSet.add(id));
      }

      return newSet;
    });
  }, []);

  const handleToggleMonthSelection = useCallback(
    (monthObj: Record<string, CalendarEvent[]>) => {
      const monthEventIds = Object.values(monthObj)
        .flatMap((events) => events.map((event) => event.id))
        .filter((id): id is string => id !== undefined);

      setSelectedEventIds((prev) => {
        const newSet = new Set(prev);
        const allMonthEventsSelected = monthEventIds.every((id) =>
          newSet.has(id),
        );

        if (allMonthEventsSelected) {
          // Deselect all events in this month
          monthEventIds.forEach((id) => newSet.delete(id));
        } else {
          // Select all events in this month
          monthEventIds.forEach((id) => newSet.add(id));
        }

        return newSet;
      });
    },
    [],
  );

  const handleToggleYearSelection = useCallback(
    (yearObj: Record<string, Record<string, CalendarEvent[]>>) => {
      const yearEventIds = Object.values(yearObj)
        .flatMap((monthObj) =>
          Object.values(monthObj).flatMap((events) =>
            events.map((event) => event.id),
          ),
        )
        .filter((id): id is string => id !== undefined);

      setSelectedEventIds((prev) => {
        const newSet = new Set(prev);
        const allYearEventsSelected = yearEventIds.every((id) =>
          newSet.has(id),
        );

        if (allYearEventsSelected) {
          // Deselect all events in this year
          yearEventIds.forEach((id) => newSet.delete(id));
        } else {
          // Select all events in this year
          yearEventIds.forEach((id) => newSet.add(id));
        }

        return newSet;
      });
    },
    [],
  );

  const handleToggleAllSelection = useCallback(() => {
    const allEventIds = getAllEventIds();

    if (allEventIds.length === 0) return;

    setSelectedEventIds((prev) => {
      const newSet = new Set(prev);
      const allEventsSelected = allEventIds.every((id) => newSet.has(id));

      if (allEventsSelected) {
        // Deselect all events
        allEventIds.forEach((id) => newSet.delete(id));
      } else {
        // Select all events
        allEventIds.forEach((id) => newSet.add(id));
      }

      return newSet;
    });
  }, [getAllEventIds]);

  const clearSelection = useCallback(() => {
    setSelectedEventIds(new Set());
  }, []);

  return {
    selectedEventIds,
    getAllEventIds,
    handleToggleEventSelection,
    handleToggleDaySelection,
    handleToggleMonthSelection,
    handleToggleYearSelection,
    handleToggleAllSelection,
    clearSelection,
  };
};
