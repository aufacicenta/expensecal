"use client";

import { useContext } from "react";

import { CreateFromTextSuccessResponse } from "@/app/api/v1/events/create-from-text/types";
import { CreateEventRequestBody } from "@/app/api/v1/events/create/types";
import {
  CreateInstallmentsRequestBody,
  DeleteInstallmentsRequestBody,
} from "@/app/api/v1/events/installments/types";
import { ParseRequestBody } from "@/app/api/v1/events/parse/types";
import { CalendarContext } from "@/context/Calendar/CalendarContext";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { EventsContext } from "./EventsContext";
import {
  EventsContextControllerProps,
  EventsContextType,
} from "./EventsContext.types";

export const EventsContextController = ({
  children,
}: EventsContextControllerProps) => {
  const routes = useRoutes();
  const calendarContext = useContext(CalendarContext);

  /**
   * Full calendar reload (fallback for multi-event changes)
   */
  const reloadCalendar = async () => {
    if (calendarContext) {
      const currentMonth = new Date().toISOString().split("T")[0].slice(0, 7);
      await calendarContext.loadCalendar(currentMonth);
    }
  };

  /**
   * Fetch events for a specific date and update only that cell
   * More efficient than full reload for single-event changes
   */
  const updateCalendarCell = async (eventDate: Date) => {
    if (!calendarContext) return;

    const dateStr = eventDate.toISOString().split("T")[0];

    try {
      calendarContext.setCellLoading(dateStr, true);

      // Fetch events for this specific date by using a focused query
      const params = new URLSearchParams();
      const monthStr = eventDate.toISOString().split("T")[0].slice(0, 7);
      params.append("month", monthStr);
      params.append("range", "0"); // Fetch only the requested month

      const response = await fetch(
        `${routes.api.v1.calendar.get()}?${params.toString()}`,
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

      if (data.success) {
        // Find the events for the specific date
        const dateEvents: any[] = [];
        for (const month of data.data.months) {
          for (const day of month.days) {
            if (day.date === dateStr) {
              dateEvents.push(...day.events);
              break;
            }
          }
        }

        // Update only this cell
        await calendarContext.updateCellEvents(dateStr, dateEvents);
      }
    } catch (error) {
      console.error("Error updating calendar cell:", error);
      // Fallback to full reload on error
      await reloadCalendar();
    } finally {
      calendarContext.setCellLoading(dateStr, false);
    }
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

  const props: EventsContextType = {
    createEventFromText,
    parseEventText,
    createEvent,
    createInstallments,
    listInstallments,
    deleteInstallments,
  };

  return (
    <EventsContext.Provider value={props}>{children}</EventsContext.Provider>
  );
};
