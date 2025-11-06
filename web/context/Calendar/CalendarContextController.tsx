"use client";

import { useRoutes } from "@/hooks/useRoutes/useRoutes";

import { CalendarContext } from "./CalendarContext";
import {
  CalendarContextControllerProps,
  CalendarContextType,
} from "./CalendarContext.types";

export const CalendarContextController = ({
  children,
}: CalendarContextControllerProps) => {
  const routes = useRoutes();

  const fetchCalendar = async (month?: string, range?: number) => {
    try {
      const params = new URLSearchParams();
      if (month) {
        params.append("month", month);
      }
      if (range !== undefined) {
        params.append("range", range.toString());
      }

      const queryString = params.toString();
      const url = queryString
        ? `${routes.api.v1.calendar.get()}?${queryString}`
        : routes.api.v1.calendar.get();

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching calendar:", error);
      throw error;
    }
  };

  const props: CalendarContextType = {
    fetchCalendar,
  };

  return (
    <CalendarContext.Provider value={props}>
      {children}
    </CalendarContext.Provider>
  );
};
