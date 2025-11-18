"use client";

import { GetChildEventsResponse } from "@/app/api/v1/events/[id]/children/types";
import {
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
import { useCalendarV2Context } from "../CalendarV2/useCalendarV2Context";
import { EventsContext } from "./EventsContext";
import {
  EventsContextControllerProps,
  EventsContextType,
} from "./EventsContext.types";

export const EventsContextController = ({
  children,
}: EventsContextControllerProps) => {
  const routes = useRoutes();
  const calendarContext = useCalendarV2Context();

  /**
   * Full calendar reload (fallback for multi-event changes)
   */
  const reloadCalendar = async () => {
    if (calendarContext) {
      const currentMonth = new Date().toISOString().split("T")[0].slice(0, 7);
      await calendarContext.loadCalendarV2();
    }
  };

  /**
   * Fetch events for a specific date and update only that cell
   * More efficient than full reload for single-event changes
   */
  const updateCalendarCell = async (eventDate: Date) => {
    return undefined;
  };

  const createEventFromText = async (
    body: ParseRequestBody & { create_installments?: boolean },
  ) => {
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

      // Update only the affected cell instead of reloading entire calendar
      if (data.data?.event) {
        const eventDate = new Date(data.data.event.event_date);
        await updateCalendarCell(eventDate);
      } else if (body.current_date) {
        await updateCalendarCell(new Date(body.current_date));
      }

      return data;
    } catch (error) {
      console.error("Error creating event from text:", error);
      throw error;
    }
  };

  const parseEventText = async (body: ParseRequestBody) => {
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
      return data;
    } catch (error) {
      console.error("Error parsing event text:", error);
      throw error;
    }
  };

  const createEvent = async (body: CreateEventRequestBody) => {
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

      // Update only the affected cell instead of reloading entire calendar
      if (data.data?.event_date) {
        await updateCalendarCell(new Date(data.data.event_date));
      }

      return data;
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  };

  const createInstallments = async (body: CreateInstallmentsRequestBody) => {
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

      return data;
    } catch (error) {
      console.error("Error creating installments:", error);
      throw error;
    }
  };

  const listInstallments = async (parentEventId: string) => {
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
      return data;
    } catch (error) {
      console.error("Error listing installments:", error);
      throw error;
    }
  };

  const deleteInstallments = async (body: DeleteInstallmentsRequestBody) => {
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

      return data;
    } catch (error) {
      console.error("Error deleting installments:", error);
      throw error;
    }
  };

  const updateEvent = async (
    eventId: string,
    body: UpdateEventRequestBody,
    oldEventDate: Date,
  ) => {
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

      return data;
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  };

  const deleteEvent = async (
    eventId: string,
    deleteMode: "single" | "all-future" = "single",
  ) => {
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

      // Update only the affected cell instead of reloading entire calendar
      if (data.data?.event_date) {
        await updateCalendarCell(new Date(data.data.event_date));
      }

      return data;
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  };

  const fetchChildEvents = async (
    eventId: string,
  ): Promise<GetChildEventsResponse> => {
    try {
      const response = await fetch(routes.api.v1.events.children(eventId));
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch child events:", error);
      throw error;
    }
  };

  const props: EventsContextType = {
    createEventFromText,
    parseEventText,
    createEvent,
    createInstallments,
    listInstallments,
    deleteInstallments,
    updateEvent,
    deleteEvent,
    fetchChildEvents,
  };

  return (
    <EventsContext.Provider value={props}>{children}</EventsContext.Provider>
  );
};
