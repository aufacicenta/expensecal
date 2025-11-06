"use client";

import { useState } from "react";

import { CreateEventRequestBody } from "@/app/api/v1/events/create/types";
import {
  CreateInstallmentsRequestBody,
  DeleteInstallmentsRequestBody,
} from "@/app/api/v1/events/installments/types";
import { ParseRequestBody } from "@/app/api/v1/events/parse/types";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { EventsContext } from "./EventsContext";
import {
  EventsContextControllerProps,
  EventsContextType,
} from "./EventsContext.types";

export const EventsContextController = ({
  children,
}: EventsContextControllerProps) => {
  const [state, setState] = useState(undefined);

  const routes = useRoutes();

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

      const data = await response.json();
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
