"use client";

import { useCallback, useEffect, useRef } from "react";

import { GetEventResponse } from "@/app/api/v1/events/[id]/types";
import { RawCalendarEvent } from "@/app/api/v2/calendar/types";
import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";

export type UseEventStatusPollingOptions = {
  /**
   * Polling interval in milliseconds
   * @default 5000 (5 seconds)
   */
  pollInterval?: number;

  /**
   * Whether polling is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Callback when an event is updated
   */
  onEventUpdated?: (eventId: string, event: RawCalendarEvent) => void;
};

/**
 * Hook to poll for event status updates
 * Automatically polls for events with inventory_metadata in PENDING or IN_PROGRESS state
 *
 * @param eventIds - Array of event IDs to poll for
 * @param options - Polling options
 */
export const useEventStatusPolling = (
  eventIds: string[],
  options: UseEventStatusPollingOptions = {},
) => {
  const { pollInterval = 5000, enabled = true, onEventUpdated } = options;

  const routes = useRoutes();
  const { updateRawEventById } = useCalendarV2Context();

  // Track which events are currently being fetched to prevent duplicate requests
  const fetchingRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch a single event and update the calendar context
   */
  const fetchEvent = useCallback(
    async (eventId: string): Promise<RawCalendarEvent | null> => {
      // Skip if already fetching this event
      if (fetchingRef.current.has(eventId)) {
        return null;
      }

      fetchingRef.current.add(eventId);

      try {
        const response = await fetch(routes.api.v1.events.detail(eventId), {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const data = (await response.json()) as GetEventResponse;

        if (data.success && "data" in data) {
          const event = data.data as RawCalendarEvent;

          // Update the event in the calendar context
          updateRawEventById(eventId, event);

          // Call the callback if provided
          onEventUpdated?.(eventId, event);

          return event;
        }

        return null;
      } catch (error) {
        console.error(`Error fetching event ${eventId}:`, error);

        return null;
      } finally {
        fetchingRef.current.delete(eventId);
      }
    },
    [routes.api.v1.events, updateRawEventById, onEventUpdated],
  );

  /**
   * Fetch a single event (exposed for manual calls, e.g., from EventInfoDrawer)
   */
  const fetchEventById = useCallback(
    async (eventId: string): Promise<RawCalendarEvent | null> => {
      return fetchEvent(eventId);
    },
    [fetchEvent],
  );

  /**
   * Poll all pending events
   */
  const pollEvents = useCallback(async () => {
    if (eventIds.length === 0) return;

    // Fetch all events in parallel
    await Promise.all(eventIds.map((id) => fetchEvent(id)));
  }, [eventIds, fetchEvent]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled || eventIds.length === 0) {
      // Clear interval if disabled or no events to poll
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      return;
    }

    // Initial poll
    pollEvents();

    // Set up interval
    intervalRef.current = setInterval(pollEvents, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, eventIds, pollInterval, pollEvents]);

  return {
    /**
     * Manually fetch a single event by ID
     * Useful for EventInfoDrawer to refresh on open
     */
    fetchEventById,

    /**
     * Manually trigger a poll of all pending events
     */
    pollEvents,
  };
};
