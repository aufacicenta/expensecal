"use client";

import { useState } from "react";

import { useCalendarV2Context } from "../CalendarV2/useCalendarV2Context";

import { EventsContext } from "./EventsContext";
import {
  CreateEventFromTextOptions,
  EventsContextActionStates,
  EventsContextControllerProps,
  EventsContextType,
} from "./EventsContext.types";

import { GetChildEventsResponse } from "@/app/api/v1/events/[id]/children/types";
import {
  MakeRecurringRequestBody,
  MakeRecurringResponse,
} from "@/app/api/v1/events/[id]/make-recurring/types";
import {
  DeleteMode,
  UpdateEventRequestBody,
  UpdateEventSuccessResponse,
} from "@/app/api/v1/events/[id]/types";
import { CreateFromTextSuccessResponse } from "@/app/api/v1/events/create-from-text/types";
import { CreateEventRequestBody } from "@/app/api/v1/events/create/types";
import {
  CreateInstallmentsRequestBody,
  DeleteInstallmentsRequestBody,
} from "@/app/api/v1/events/installments/types";
import { ParseRequestBody } from "@/app/api/v1/events/parse/types";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";

export const EventsContextController = ({
  children,
}: EventsContextControllerProps) => {
  const routes = useRoutes();
  const calendarContext = useCalendarV2Context();
  const [actionStates, setActionStates] = useState<EventsContextActionStates>({
    createEventFromText: { isLoading: false, error: undefined },
    parseEventText: { isLoading: false, error: undefined },
    createEvent: { isLoading: false, error: undefined },
    createInstallments: { isLoading: false, error: undefined },
    listInstallments: { isLoading: false, error: undefined },
    deleteInstallments: { isLoading: false, error: undefined },
    updateEvent: { isLoading: false, error: undefined },
    deleteEvent: { isLoading: false, error: undefined },
    deleteEventMultiple: { isLoading: false, error: undefined },
    fetchChildEvents: { isLoading: false, error: undefined },
    makeEventRecurring: { isLoading: false, error: undefined },
  });

  /**
   * Full calendar reload (fallback for multi-event changes)
   */
  const reloadCalendar = async () => {
    if (calendarContext) {
      await calendarContext.loadCalendarV2();
    }
  };

  const createEventFromText = async (
    body: ParseRequestBody & { create_installments?: boolean },
    options?: CreateEventFromTextOptions,
  ) => {
    setActionStates((prev) => ({
      ...prev,
      createEventFromText: { isLoading: true, error: undefined },
    }));
    try {
      const response = await fetch(
        routes.api.v1.events.createFromText?.() ||
          "/api/v1/events/create-from-text",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as CreateFromTextSuccessResponse;

      // Skip reload if specified (useful for batch operations)
      if (!options?.skipReload) {
        await reloadCalendar();
      }

      setActionStates((prev) => ({
        ...prev,
        createEventFromText: { isLoading: false, error: undefined },
      }));

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        createEventFromText: { isLoading: false, error: errorMsg },
      }));
      console.error("Error creating event from text:", error);
      throw error;
    }
  };

  const parseEventText = async (body: ParseRequestBody) => {
    setActionStates((prev) => ({
      ...prev,
      parseEventText: { isLoading: true, error: undefined },
    }));
    try {
      const response = await fetch(routes.api.v1.events.parse(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setActionStates((prev) => ({
        ...prev,
        parseEventText: { isLoading: false, error: undefined },
      }));

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        parseEventText: { isLoading: false, error: errorMsg },
      }));
      console.error("Error parsing event text:", error);
      throw error;
    }
  };

  const createEvent = async (body: CreateEventRequestBody) => {
    setActionStates((prev) => ({
      ...prev,
      createEvent: { isLoading: true, error: undefined },
    }));
    try {
      const response = await fetch(routes.api.v1.events.create(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setActionStates((prev) => ({
        ...prev,
        createEvent: { isLoading: false, error: undefined },
      }));

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        createEvent: { isLoading: false, error: errorMsg },
      }));
      console.error("Error creating event:", error);
      throw error;
    }
  };

  const createInstallments = async (body: CreateInstallmentsRequestBody) => {
    setActionStates((prev) => ({
      ...prev,
      createInstallments: { isLoading: true, error: undefined },
    }));
    try {
      const response = await fetch(routes.api.v1.events.installments.create(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // For installments spanning multiple months, reload entire calendar
      // This is less frequent than single event creation
      await reloadCalendar();

      setActionStates((prev) => ({
        ...prev,
        createInstallments: { isLoading: false, error: undefined },
      }));

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        createInstallments: { isLoading: false, error: errorMsg },
      }));
      console.error("Error creating installments:", error);
      throw error;
    }
  };

  const listInstallments = async (parentEventId: string) => {
    setActionStates((prev) => ({
      ...prev,
      listInstallments: { isLoading: true, error: undefined },
    }));
    try {
      const response = await fetch(
        `${routes.api.v1.events.installments.list()}?parent_event_id=${encodeURIComponent(parentEventId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setActionStates((prev) => ({
        ...prev,
        listInstallments: { isLoading: false, error: undefined },
      }));

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        listInstallments: { isLoading: false, error: errorMsg },
      }));
      console.error("Error listing installments:", error);
      throw error;
    }
  };

  const deleteInstallments = async (body: DeleteInstallmentsRequestBody) => {
    setActionStates((prev) => ({
      ...prev,
      deleteInstallments: { isLoading: true, error: undefined },
    }));
    try {
      const response = await fetch(routes.api.v1.events.installments.delete(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // For installments spanning multiple months, reload entire calendar
      // This is less frequent than single event deletion
      await reloadCalendar();

      setActionStates((prev) => ({
        ...prev,
        deleteInstallments: { isLoading: false, error: undefined },
      }));

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        deleteInstallments: { isLoading: false, error: errorMsg },
      }));
      console.error("Error deleting installments:", error);
      throw error;
    }
  };

  const updateEvent = async (
    eventId: string,
    body: UpdateEventRequestBody,
    oldEventDate: Date,
  ) => {
    setActionStates((prev) => ({
      ...prev,
      updateEvent: { isLoading: true, error: undefined },
    }));
    try {
      const response = await fetch(routes.api.v1.events.detail(eventId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as UpdateEventSuccessResponse;

      calendarContext.updateCalendarCellEvent(data.data, oldEventDate);

      setActionStates((prev) => ({
        ...prev,
        updateEvent: { isLoading: false, error: undefined },
      }));

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        updateEvent: { isLoading: false, error: errorMsg },
      }));
      console.error("Error updating event:", error);
      throw error;
    }
  };

  const deleteEvent = async (
    eventId: string,
    deleteMode: DeleteMode = "single",
  ) => {
    setActionStates((prev) => ({
      ...prev,
      deleteEvent: { isLoading: true, error: undefined },
    }));
    try {
      const params = new URLSearchParams();

      params.append("deleteMode", deleteMode);

      const response = await fetch(
        `${routes.api.v1.events.detail(eventId)}?${params.toString()}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update calendar to reflect deletion
      await reloadCalendar();

      setActionStates((prev) => ({
        ...prev,
        deleteEvent: { isLoading: false, error: undefined },
      }));

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        deleteEvent: { isLoading: false, error: errorMsg },
      }));
      console.error("Error deleting event:", error);
      throw error;
    }
  };

  const deleteEventMultiple = async (
    eventIds: string[],
    deleteMode: DeleteMode = "single",
  ) => {
    setActionStates((prev) => ({
      ...prev,
      deleteEventMultiple: { isLoading: true, error: undefined },
    }));
    try {
      const response = await fetch(routes.api.v1.events.deleteMultiple(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventIds,
          deleteMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();

      // Reload calendar after bulk deletion
      await reloadCalendar();

      setActionStates((prev) => ({
        ...prev,
        deleteEventMultiple: { isLoading: false, error: undefined },
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        deleteEventMultiple: { isLoading: false, error: errorMsg },
      }));
      console.error("Error deleting multiple events:", error);
      throw error;
    }
  };

  const fetchChildEvents = async (
    eventId: string,
  ): Promise<GetChildEventsResponse> => {
    setActionStates((prev) => ({
      ...prev,
      fetchChildEvents: { isLoading: true, error: undefined },
    }));
    try {
      const response = await fetch(routes.api.v1.events.children(eventId));
      const data = await response.json();

      setActionStates((prev) => ({
        ...prev,
        fetchChildEvents: { isLoading: false, error: undefined },
      }));

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        fetchChildEvents: { isLoading: false, error: errorMsg },
      }));
      console.error("Failed to fetch child events:", error);
      throw error;
    }
  };

  const makeEventRecurring = async (
    eventId: string,
    body: MakeRecurringRequestBody,
  ): Promise<MakeRecurringResponse> => {
    setActionStates((prev) => ({
      ...prev,
      makeEventRecurring: { isLoading: true, error: undefined },
    }));
    try {
      const response = await fetch(
        routes.api.v1.events.makeRecurring(eventId),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as MakeRecurringResponse;

      // Reload calendar to reflect new recurring events
      await reloadCalendar();

      setActionStates((prev) => ({
        ...prev,
        makeEventRecurring: { isLoading: false, error: undefined },
      }));

      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        makeEventRecurring: { isLoading: false, error: errorMsg },
      }));
      console.error("Error making event recurring:", error);
      throw error;
    }
  };

  const props: EventsContextType = {
    actionStates,
    createEventFromText,
    reloadCalendar,
    parseEventText,
    createEvent,
    createInstallments,
    listInstallments,
    deleteInstallments,
    updateEvent,
    deleteEvent,
    deleteEventMultiple,
    fetchChildEvents,
    makeEventRecurring,
  };

  return (
    <EventsContext.Provider value={props}>{children}</EventsContext.Provider>
  );
};
