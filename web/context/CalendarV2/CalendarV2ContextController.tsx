"use client";

import {
  CalendarData,
  GetCalendarSuccessResponse as GetCalendarV2SuccessResponse,
} from "@/app/api/v2/calendar/types";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { useState } from "react";

import { CalendarV2Context } from "./CalendarV2Context";
import {
  CalendarV2ContextControllerProps,
  CalendarV2ContextType,
} from "./CalendarV2Context.types";

export const CalendarV2ContextController = ({
  children,
}: CalendarV2ContextControllerProps) => {
  const routes = useRoutes();
  const [calendarV2Data, setCalendarV2Data] = useState<CalendarData | null>(
    null,
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCalendarV2 = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = routes.api.v2.calendar.get();
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
      if (data.success) {
        const successResponse = data as GetCalendarV2SuccessResponse;
        setCalendarV2Data(successResponse.data);
      } else {
        const errorMsg = data.error || "Failed to load calendar";
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

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  };

  const props: CalendarV2ContextType = {
    calendarV2Data,
    currentMonth,
    loading,
    error,
    loadCalendarV2,
    goToPreviousMonth,
    goToNextMonth,
  };

  return (
    <CalendarV2Context.Provider value={props}>
      {children}
    </CalendarV2Context.Provider>
  );
};
