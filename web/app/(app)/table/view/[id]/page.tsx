"use client";

import { Button } from "@heroui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import { EventsTable } from "@/components/events-table/EventsTable";
import { CurrentViewInfo } from "@/components/events-table/events-table-header/EventsTableHeader.types";
import { FullPageLoadingState } from "@/components/full-page-loading-state/FullPageLoadingState";
import { CalendarV2Context } from "@/context/CalendarV2/CalendarV2Context";
import { CalendarV2ContextType } from "@/context/CalendarV2/CalendarV2Context.types";
import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { useEventGroupsContext } from "@/context/EventGroups/useEventGroupsContext";
import { useExchangeRatesContext } from "@/context/ExchangeRates/useExchangeRatesContext";
import { useUserPreferencesContext } from "@/context/UserPreferences/useUserPreferencesContext";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { CalendarEvent } from "@/app/api/v2/calendar/types";
import { processEventsIntoCalendar } from "@/lib/calendar/stats";

type ViewPageProps = {
  params: Promise<{ id: string }>;
};

export default function EventGroupViewPage({ params }: ViewPageProps) {
  const { id } = use(params);
  const routes = useRoutes();
  const { rates: exchangeRates } = useExchangeRatesContext();
  const { baseCurrency } = useUserPreferencesContext();
  const parentCalendarContext = useCalendarV2Context();
  const { fetchEventGroup } = useEventGroupsContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [rawEvents, setRawEvents] = useState<CalendarEvent[]>([]);

  // Fetch event group data
  useEffect(() => {
    const loadEventGroup = async () => {
      setLoading(true);
      setError(null);

      const result = await fetchEventGroup(id);

      if (result.success) {
        setGroupName(result.data.group.name);
        // Convert events to CalendarEvent format
        const events = result.data.events.map((event) => ({
          ...event,
          event_date: new Date(event.event_date),
          exchangeRate: "1", // Will be recalculated in processEventsIntoCalendar
        }));

        setRawEvents(events as CalendarEvent[]);
      } else {
        setError(result.error);
      }

      setLoading(false);
    };

    loadEventGroup();
  }, [id, fetchEventGroup]);

  // Process events into calendar structure using the shared utility
  const processedData = useMemo(() => {
    if (rawEvents.length === 0) {
      return { calendar: {}, stats: {} };
    }

    return processEventsIntoCalendar(
      rawEvents,
      exchangeRates,
      baseCurrency?.symbol || "USD",
    );
  }, [rawEvents, exchangeRates, baseCurrency]);

  // Create a context value that overrides the calendar data
  const viewContextValue: CalendarV2ContextType = useMemo(
    () => ({
      ...parentCalendarContext,
      calendarV2Data: processedData,
      filteredCalendarData: processedData,
      actionStates: {
        ...parentCalendarContext.actionStates,
        loadCalendarV2: {
          isLoading: loading,
          error: error || undefined,
        },
      },
      // Override loadCalendarV2 to reload the view data
      loadCalendarV2: async () => {
        // Re-fetch will happen via useEffect on id change
      },
    }),
    [parentCalendarContext, processedData, loading, error],
  );

  // Create current view info for the header
  const currentViewInfo: CurrentViewInfo = useMemo(
    () => ({
      id,
      name: groupName,
      eventCount: rawEvents.length,
    }),
    [id, groupName, rawEvents.length],
  );

  if (loading) {
    return <FullPageLoadingState />;
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-danger">{error}</p>
        <Link href={routes.table.index()}>
          <Button startContent={<ArrowLeft size={16} />}>Back to Table</Button>
        </Link>
      </div>
    );
  }

  return (
    <CalendarV2Context.Provider value={viewContextValue}>
      <EventsTable currentView={currentViewInfo} />
    </CalendarV2Context.Provider>
  );
}
