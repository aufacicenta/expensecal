"use client";

import { useState } from "react";

import { CreateEventRequestBody } from "@/app/api/v1/events/create/types";
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

  const props: EventsContextType = {
    parseEventText,
    createEvent,
  };

  return (
    <EventsContext.Provider value={props}>{children}</EventsContext.Provider>
  );
};
