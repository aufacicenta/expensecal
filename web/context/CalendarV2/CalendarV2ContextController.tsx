"use client";

import Decimal from "decimal.js";
import { useState } from "react";

import { CalendarV2Context } from "./CalendarV2Context";
import {
  CalendarV2ContextActionStates,
  CalendarV2ContextControllerProps,
  CalendarV2ContextType,
} from "./CalendarV2Context.types";

import { GetCalendarV2SuccessResponse } from "@/app/api/v2/calendar/types";
import { useExchangeRatesContext } from "@/context/ExchangeRates/useExchangeRatesContext";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import {
  addEventToStats,
  applyCascadeForwardStats,
  convertAmount,
  rebuildMonthStatsFromCalendar,
  rebuildYearStatsFromMonths,
  recalculateNetsAfterUpdate,
  subtractEventFromStats,
} from "@/lib/calendar/stats";
import { toDateString } from "@/lib/date";

export const CalendarV2ContextController = ({
  children,
}: CalendarV2ContextControllerProps) => {
  const routes = useRoutes();
  const exchangeRatesContext = useExchangeRatesContext();

  const [calendarV2Data, setCalendarV2Data] = useState<
    GetCalendarV2SuccessResponse["data"] | undefined
  >(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [actionStates, setActionStates] =
    useState<CalendarV2ContextActionStates>({
      loadCalendarV2: {
        isLoading: true,
        error: undefined,
      },
    });

  const loadCalendarV2 = async () => {
    setActionStates((prev) => ({
      ...prev,
      loadCalendarV2: {
        isLoading: true,
        error: undefined,
      },
    }));
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
        setActionStates((prev) => ({
          ...prev,
          loadCalendarV2: {
            isLoading: false,
            error: undefined,
          },
        }));
      } else {
        const errorMsg = data.error || "Failed to load calendar";

        setActionStates((prev) => ({
          ...prev,
          loadCalendarV2: {
            isLoading: false,
            error: errorMsg,
          },
        }));
        console.error("Failed to load calendar:", errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        loadCalendarV2: {
          isLoading: false,
          error: errorMsg,
        },
      }));
      console.error("Error loading calendar:", err);
    }
  };

  /**
   * Remove a deleted event from the calendar and recalculate stats
   * Handles deletion of single events and updates stats at all levels
   * Applies carry-forward cascade to ensure all subsequent periods have correct stats
   */
  const deleteCalendarCellEvent = (deletedEvent: any, eventDate: Date) => {
    if (!calendarV2Data) return false;

    // Create a deep copy to avoid direct state mutations
    const newCalendarData = JSON.parse(JSON.stringify(calendarV2Data));

    const eventDateStr = toDateString(eventDate);
    const [year, month, day] = eventDateStr.split("-");

    // Find and remove the event from the calendar
    if (newCalendarData.calendar[year]?.[month]?.[day]) {
      const eventIndex = newCalendarData.calendar[year][month][day].findIndex(
        (e: any) => e.id === deletedEvent.id,
      );

      if (eventIndex === -1) return false;

      // Get the deleted event's converted amount for stats recalculation
      const deletedConvertedAmount = new Decimal(
        deletedEvent.exchangeRate || "0",
      );

      // Remove event from calendar
      newCalendarData.calendar[year][month][day].splice(eventIndex, 1);

      // If no events left for this day, remove the entire day object
      const dayStillHasEvents =
        newCalendarData.calendar[year][month][day].length > 0;

      if (!dayStillHasEvents) {
        delete newCalendarData.calendar[year][month][day];
        delete (newCalendarData.stats[year][month] as any)[day];
      }

      // Subtract event from stats at all levels
      subtractEventFromStats(
        newCalendarData.stats,
        deletedConvertedAmount,
        deletedEvent.type === "INCOME" ? "INCOME" : "EXPENSE",
        year,
        month,
        day,
      );

      // Recalculate net values at all levels
      recalculateNetsAfterUpdate(newCalendarData.stats, year, month, day);

      // Apply carry-forward cascade from the affected year onwards
      applyCascadeForwardStats(
        newCalendarData.stats,
        year,
        month,
        dayStillHasEvents ? day : undefined,
      );

      setCalendarV2Data(newCalendarData);

      return true;
    }

    return false;
  };

  /**
   * Update a calendar event in-place without reloading the entire calendar
   * Handles event updates, date changes, and stats recalculation
   * Uses latest exchange rates to recalculate converted amounts
   */
  const updateCalendarCellEvent = (updatedEvent: any, oldEventDate: Date) => {
    if (!calendarV2Data) return false;

    // Create a deep copy to avoid direct state mutations
    const newCalendarData = JSON.parse(JSON.stringify(calendarV2Data));

    const oldDateStr = toDateString(oldEventDate);
    const newDateStr = toDateString(new Date(updatedEvent.event_date));
    const [oldYear, oldMonth, oldDay] = oldDateStr.split("-");
    const [newYear, newMonth, newDay] = newDateStr.split("-");

    // Helper function to recalculate converted amount using latest exchange rates
    const recalculateConvertedAmount = (event: any): Decimal => {
      // Fall back to old exchangeRate if rates aren't available
      if (!exchangeRatesContext.rates) {
        return new Decimal(event.exchangeRate || "0");
      }

      let baseCurrency = "USD";

      if (!!exchangeRatesContext.baseCurrency) {
        baseCurrency = exchangeRatesContext.baseCurrency;
      }

      const amount = new Decimal(event.amount).times(event.quantity || 1);
      const currencySymbol = event.currency?.symbol || "UNKNOWN";

      // Convert rates object to Map for convertAmount function
      const ratesMap = new Map(Object.entries(exchangeRatesContext.rates));

      try {
        const converted = convertAmount(
          amount,
          currencySymbol,
          baseCurrency,
          ratesMap,
        );

        return converted;
      } catch (error) {
        console.warn("Error recalculating converted amount:", error);

        return new Decimal(event.exchangeRate || "0");
      }
    };

    // Find and get the old event from calendar
    let oldEventIndex = -1;

    if (newCalendarData.calendar[oldYear]?.[oldMonth]?.[oldDay]) {
      oldEventIndex = newCalendarData.calendar[oldYear][oldMonth][
        oldDay
      ].findIndex((e: any) => e.id === updatedEvent.id);

      if (oldEventIndex === -1) return false;

      const oldEvent =
        newCalendarData.calendar[oldYear][oldMonth][oldDay][oldEventIndex];
      const oldConvertedAmount = recalculateConvertedAmount(oldEvent);
      const newConvertedAmount = recalculateConvertedAmount(updatedEvent);

      // Handle date change
      if (oldDateStr !== newDateStr) {
        // Remove event from old location
        newCalendarData.calendar[oldYear][oldMonth][oldDay].splice(
          oldEventIndex,
          1,
        );

        // If no events left for this day, remove the entire day object
        const oldDayStillHasEvents =
          newCalendarData.calendar[oldYear][oldMonth][oldDay].length > 0;

        if (!oldDayStillHasEvents) {
          delete newCalendarData.calendar[oldYear][oldMonth][oldDay];
          delete (newCalendarData.stats[oldYear][oldMonth] as any)[oldDay];
        }

        // Subtract old event from old stats
        subtractEventFromStats(
          newCalendarData.stats,
          oldConvertedAmount,
          oldEvent.type === "INCOME" ? "INCOME" : "EXPENSE",
          oldYear,
          oldMonth,
          oldDay,
        );

        // Initialize new day structures if needed
        if (!newCalendarData.calendar[newYear]) {
          newCalendarData.calendar[newYear] = {};
          newCalendarData.stats[newYear] = {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          };
        }

        if (!newCalendarData.calendar[newYear][newMonth]) {
          newCalendarData.calendar[newYear][newMonth] = {};
          newCalendarData.stats[newYear][newMonth] = {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          };
        }

        if (!newCalendarData.calendar[newYear][newMonth][newDay]) {
          newCalendarData.calendar[newYear][newMonth][newDay] = [];
          (newCalendarData.stats[newYear][newMonth] as any)[newDay] = {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          };
        }

        // Add event to new location
        updatedEvent.exchangeRate = newConvertedAmount.toString();
        newCalendarData.calendar[newYear][newMonth][newDay].push(updatedEvent);

        // Add event to new stats
        addEventToStats(
          newCalendarData.stats,
          newConvertedAmount,
          updatedEvent.type === "INCOME" ? "INCOME" : "EXPENSE",
          newYear,
          newMonth,
          newDay,
        );
      } else {
        // Same day - update event in place
        updatedEvent.exchangeRate = newConvertedAmount.toString();
        newCalendarData.calendar[oldYear][oldMonth][oldDay][oldEventIndex] =
          updatedEvent;

        // Subtract old and add new using helper
        subtractEventFromStats(
          newCalendarData.stats,
          oldConvertedAmount,
          oldEvent.type === "INCOME" ? "INCOME" : "EXPENSE",
          oldYear,
          oldMonth,
          oldDay,
        );
        addEventToStats(
          newCalendarData.stats,
          newConvertedAmount,
          updatedEvent.type === "INCOME" ? "INCOME" : "EXPENSE",
          oldYear,
          oldMonth,
          oldDay,
        );
      }

      // Determine cascade start point
      const cascadeStartYear =
        oldDateStr !== newDateStr && newYear < oldYear ? newYear : oldYear;
      const cascadeStartMonth =
        cascadeStartYear === oldYear ? oldMonth : undefined;

      // Rebuild stats from calendar for affected months and all subsequent months
      // This removes the old cascade so we can reapply it cleanly
      const allYears = Object.keys(newCalendarData.calendar).sort();
      const cascadeStartYearIdx = allYears.indexOf(cascadeStartYear);

      if (cascadeStartYearIdx !== -1) {
        // Rebuild all months from cascade start year onwards
        for (
          let yearIdx = cascadeStartYearIdx;
          yearIdx < allYears.length;
          yearIdx++
        ) {
          const year = allYears[yearIdx];
          const months = Object.keys(newCalendarData.stats[year])
            .filter((k) => k !== "stats")
            .sort();

          const startMonthIdx =
            yearIdx === cascadeStartYearIdx && cascadeStartMonth
              ? months.indexOf(cascadeStartMonth)
              : 0;

          for (
            let monthIdx = startMonthIdx;
            monthIdx < months.length;
            monthIdx++
          ) {
            const month = months[monthIdx];

            rebuildMonthStatsFromCalendar(
              newCalendarData.calendar,
              newCalendarData.stats,
              year,
              month,
            );
          }
        }
      }

      // Rebuild year stats from months
      const affectedYears = new Set([oldYear]);

      if (oldDateStr !== newDateStr) {
        affectedYears.add(newYear);
      }
      rebuildYearStatsFromMonths(
        newCalendarData.stats,
        Array.from(affectedYears),
      );

      // Apply carry-forward cascade from the affected year onwards
      applyCascadeForwardStats(newCalendarData.stats, cascadeStartYear);
    }

    // Update state
    setCalendarV2Data(newCalendarData);

    return true;
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

  const goToMonth = (date: Date) => {
    const newMonth = new Date(date);

    newMonth.setDate(1);
    setCurrentMonth(newMonth);
  };

  const props: CalendarV2ContextType = {
    calendarV2Data,
    currentMonth,
    actionStates,
    loadCalendarV2,
    updateCalendarCellEvent,
    deleteCalendarCellEvent,
    goToPreviousMonth,
    goToNextMonth,
    goToMonth,
  };

  return (
    <CalendarV2Context.Provider value={props}>
      {children}
    </CalendarV2Context.Provider>
  );
};
