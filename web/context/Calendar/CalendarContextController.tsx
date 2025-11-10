"use client";

import { GetCalendarSuccessResponse } from "@/app/api/v1/calendar/types";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { useState } from "react";

import { CalendarContext } from "./CalendarContext";
import {
  CalendarContextControllerProps,
  CalendarContextType,
} from "./CalendarContext.types";

export const CalendarContextController = ({
  children,
}: CalendarContextControllerProps) => {
  const routes = useRoutes();
  const [calendarData, setCalendarData] = useState<
    GetCalendarSuccessResponse["data"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const loadCalendar = async (month?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCalendar(month, 0);
      if (response.success) {
        const successResponse = response as GetCalendarSuccessResponse;
        setCalendarData(successResponse.data);
      } else {
        const errorMsg = response.error || "Failed to load calendar";
        setError(errorMsg);
        console.error("Failed to load calendar:", errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Error loading calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  const props: CalendarContextType = {
    fetchCalendar,
    loadCalendar,
    calendarData,
    loading,
    error,
  };

  return (
    <CalendarContext.Provider value={props}>
      {children}
    </CalendarContext.Provider>
  );
};
