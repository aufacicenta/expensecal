"use client";

import {
  CalendarDay,
  CalendarEventData,
  CalendarMonth,
  GetCalendarSuccessResponse,
} from "@/app/api/v1/calendar/types";
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
  const [cellLoadingStates, setCellLoadingStatesState] = useState<
    Map<string, boolean>
  >(new Map());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

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
        // Update currentMonth from the response if available
        if (month) {
          const parts = month.split("-");
          if (parts.length === 2) {
            const year = parseInt(parts[0]);
            const monthNum = parseInt(parts[1]) - 1;
            setCurrentMonth(new Date(year, monthNum, 1));
          }
        }
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

  const goToPreviousMonth = async () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const monthStr = `${prevMonth.getFullYear()}-${String(
      prevMonth.getMonth() + 1,
    ).padStart(2, "0")}`;
    setCurrentMonth(prevMonth);
    await loadCalendar(monthStr);
  };

  const goToNextMonth = async () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthStr = `${nextMonth.getFullYear()}-${String(
      nextMonth.getMonth() + 1,
    ).padStart(2, "0")}`;
    setCurrentMonth(nextMonth);
    await loadCalendar(monthStr);
  };

  const setCellLoading = (date: string, loading: boolean) => {
    setCellLoadingStatesState((prev) => {
      const newStates = new Map(prev);
      if (loading) {
        newStates.set(date, true);
      } else {
        newStates.delete(date);
      }
      return newStates;
    });
  };

  const updateCellEvents = async (
    date: string,
    events: CalendarEventData[],
  ) => {
    if (!calendarData) return;

    try {
      setCalendarData((prev) => {
        if (!prev) return prev;

        // Deep clone the calendar data
        const updated = JSON.parse(JSON.stringify(prev));

        // Find and update the day with matching date
        for (const month of updated.months) {
          for (const day of month.days) {
            if (day.date === date) {
              // Update events for this day
              day.events = events;

              // Recalculate financial summary for this day
              const dayFinancialSummary = calculateDayFinancialSummary(events);
              day.financialSummary = {
                ...day.financialSummary,
                ...dayFinancialSummary,
              };

              // Recalculate monthly financial summary if this is in the requested month
              const requestedMonth = updated.metadata.requestedMonth; // e.g., "2025-11"
              if (date.startsWith(requestedMonth)) {
                const monthEvents =
                  updated.months
                    .find(
                      (m: CalendarMonth) =>
                        `${m.year}-${String(m.month).padStart(2, "0")}` ===
                        requestedMonth,
                    )
                    ?.days.flatMap((d: CalendarDay) => d.events) || [];

                updated.monthlyFinancialSummary =
                  calculateMonthlyFinancialSummary(monthEvents);
              }

              return updated;
            }
          }
        }

        return updated;
      });
    } catch (err) {
      console.error("Error updating cell events:", err);
    }
  };

  const optimisticAddEvent = (event: CalendarEventData) => {
    const dateStr = new Date(event.event_date).toISOString().split("T")[0];
    updateCellEvents(dateStr, [event]);
  };

  /**
   * Helper: Calculate financial summary for a day
   */
  const calculateDayFinancialSummary = (events: CalendarEventData[]) => {
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const event of events) {
      const amount = parseFloat(event.amount as unknown as string);
      if (event.type === "INCOME") {
        totalIncome += amount;
      } else if (event.type === "EXPENSE") {
        totalExpenses += amount;
      }
    }

    const net = totalIncome - totalExpenses;

    return {
      totalIncome: totalIncome.toString(),
      totalExpenses: totalExpenses.toString(),
      net: net.toString(),
      eventCount: events.length,
    };
  };

  /**
   * Helper: Calculate financial summary for the month
   */
  const calculateMonthlyFinancialSummary = (
    monthEvents: CalendarEventData[],
  ) => {
    const byCurrency: Record<string, any> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    // Group by currency
    for (const event of monthEvents) {
      const currencyId = event.currency_id;
      if (!byCurrency[currencyId]) {
        byCurrency[currencyId] = {
          symbol: (event.currency as any)?.symbol || "UNKNOWN",
          totalIncome: 0,
          totalExpenses: 0,
          eventCount: 0,
        };
      }

      const amount = parseFloat(event.amount as unknown as string);
      if (event.type === "INCOME") {
        byCurrency[currencyId].totalIncome += amount;
        totalIncome += amount;
      } else if (event.type === "EXPENSE") {
        byCurrency[currencyId].totalExpenses += amount;
        totalExpenses += amount;
      }
      byCurrency[currencyId].eventCount++;
    }

    // Convert to string format and calculate net
    for (const currencyId in byCurrency) {
      const currency = byCurrency[currencyId];
      const net = currency.totalIncome - currency.totalExpenses;
      byCurrency[currencyId] = {
        ...currency,
        totalIncome: currency.totalIncome.toString(),
        totalExpenses: currency.totalExpenses.toString(),
        net: net.toString(),
      };
    }

    const net = totalIncome - totalExpenses;

    return {
      byCurrency,
      baseCurrency: {
        totalIncome: totalIncome.toString(),
        totalExpenses: totalExpenses.toString(),
        net: net.toString(),
        symbol: "USD", // TODO: Pull from user.base_currency
        eventCount: monthEvents.length,
      },
    };
  };

  const props: CalendarContextType = {
    fetchCalendar,
    loadCalendar,
    updateCellEvents,
    setCellLoading,
    optimisticAddEvent,
    goToPreviousMonth,
    goToNextMonth,
    calendarData,
    loading,
    error,
    cellLoadingStates,
    currentMonth,
  };

  return (
    <CalendarContext.Provider value={props}>
      {children}
    </CalendarContext.Provider>
  );
};
