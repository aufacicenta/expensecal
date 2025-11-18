"use client";

import { GetCalendarV2SuccessResponse } from "@/app/api/v2/calendar/types";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { toDateString } from "@/lib/date";
import Decimal from "decimal.js";
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
  const [calendarV2Data, setCalendarV2Data] = useState<
    GetCalendarV2SuccessResponse["data"] | undefined
  >(undefined);
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

  /**
   * Update a calendar event in-place without reloading the entire calendar
   * Handles event updates, date changes, and stats recalculation
   */
  const updateCalendarCellEvent = (updatedEvent: any, oldEventDate: Date) => {
    if (!calendarV2Data) return false;

    // Create a deep copy to avoid direct state mutations
    const newCalendarData = JSON.parse(JSON.stringify(calendarV2Data));

    const oldDateStr = toDateString(oldEventDate);
    const newDateStr = toDateString(new Date(updatedEvent.event_date));
    const [oldYear, oldMonth, oldDay] = oldDateStr.split("-");
    const [newYear, newMonth, newDay] = newDateStr.split("-");

    // Find and remove event from old location
    let oldEventIndex = -1;
    if (newCalendarData.calendar[oldYear]?.[oldMonth]?.[oldDay]) {
      oldEventIndex = newCalendarData.calendar[oldYear][oldMonth][
        oldDay
      ].findIndex((e: any) => e.id === updatedEvent.id);

      if (oldEventIndex === -1) return false;

      // Get the old event for stats recalculation
      const oldEvent =
        newCalendarData.calendar[oldYear][oldMonth][oldDay][oldEventIndex];

      // Remove event from old location if date changed
      if (oldDateStr !== newDateStr) {
        newCalendarData.calendar[oldYear][oldMonth][oldDay].splice(
          oldEventIndex,
          1,
        );

        // Subtract old event's contribution from old stats
        const oldConvertedAmount = new Decimal(oldEvent.exchangeRate);
        if (oldEvent.type === "INCOME") {
          newCalendarData.stats[oldYear][oldMonth][oldDay].totalIncome =
            new Decimal(
              newCalendarData.stats[oldYear][oldMonth][oldDay].totalIncome,
            )
              .minus(oldConvertedAmount)
              .toString();
          (newCalendarData.stats[oldYear][oldMonth] as any).stats.totalIncome =
            new Decimal(
              (
                newCalendarData.stats[oldYear][oldMonth] as any
              ).stats.totalIncome,
            )
              .minus(oldConvertedAmount)
              .toString();
          newCalendarData.stats[oldYear].stats.totalIncome = new Decimal(
            newCalendarData.stats[oldYear].stats.totalIncome,
          )
            .minus(oldConvertedAmount)
            .toString();
        } else if (oldEvent.type === "EXPENSE") {
          newCalendarData.stats[oldYear][oldMonth][oldDay].totalExpenses =
            new Decimal(
              newCalendarData.stats[oldYear][oldMonth][oldDay].totalExpenses,
            )
              .minus(oldConvertedAmount)
              .toString();
          (
            newCalendarData.stats[oldYear][oldMonth] as any
          ).stats.totalExpenses = new Decimal(
            (
              newCalendarData.stats[oldYear][oldMonth] as any
            ).stats.totalExpenses,
          )
            .minus(oldConvertedAmount)
            .toString();
          newCalendarData.stats[oldYear].stats.totalExpenses = new Decimal(
            newCalendarData.stats[oldYear].stats.totalExpenses,
          )
            .minus(oldConvertedAmount)
            .toString();
        }

        // Recalculate net for old stats
        (newCalendarData.stats[oldYear][oldMonth] as any)[oldDay].net =
          new Decimal(
            (newCalendarData.stats[oldYear][oldMonth] as any)[
              oldDay
            ].totalIncome,
          )
            .minus(
              (newCalendarData.stats[oldYear][oldMonth] as any)[oldDay]
                .totalExpenses,
            )
            .toString();
        (newCalendarData.stats[oldYear][oldMonth] as any).stats.net =
          new Decimal(
            (newCalendarData.stats[oldYear][oldMonth] as any).stats.totalIncome,
          )
            .minus(
              (newCalendarData.stats[oldYear][oldMonth] as any).stats
                .totalExpenses,
            )
            .toString();
        newCalendarData.stats[oldYear].stats.net = new Decimal(
          newCalendarData.stats[oldYear].stats.totalIncome,
        )
          .minus(newCalendarData.stats[oldYear].stats.totalExpenses)
          .toString();
      } else {
        // Same day - just update the event in place
        newCalendarData.calendar[oldYear][oldMonth][oldDay][oldEventIndex] =
          updatedEvent;
      }
    }

    // Initialize new day structure if it doesn't exist and date changed
    if (oldDateStr !== newDateStr) {
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

      // Add updated event to new location
      newCalendarData.calendar[newYear][newMonth][newDay].push(updatedEvent);

      // Add new event's contribution to new stats
      const newConvertedAmount = new Decimal(updatedEvent.exchangeRate);
      if (updatedEvent.type === "INCOME") {
        (newCalendarData.stats[newYear][newMonth] as any)[newDay].totalIncome =
          new Decimal(
            (newCalendarData.stats[newYear][newMonth] as any)[
              newDay
            ].totalIncome,
          )
            .plus(newConvertedAmount)
            .toString();
        (newCalendarData.stats[newYear][newMonth] as any).stats.totalIncome =
          new Decimal(
            (newCalendarData.stats[newYear][newMonth] as any).stats.totalIncome,
          )
            .plus(newConvertedAmount)
            .toString();
        newCalendarData.stats[newYear].stats.totalIncome = new Decimal(
          newCalendarData.stats[newYear].stats.totalIncome,
        )
          .plus(newConvertedAmount)
          .toString();
      } else if (updatedEvent.type === "EXPENSE") {
        (newCalendarData.stats[newYear][newMonth] as any)[
          newDay
        ].totalExpenses = new Decimal(
          (newCalendarData.stats[newYear][newMonth] as any)[
            newDay
          ].totalExpenses,
        )
          .plus(newConvertedAmount)
          .toString();
        (newCalendarData.stats[newYear][newMonth] as any).stats.totalExpenses =
          new Decimal(
            (
              newCalendarData.stats[newYear][newMonth] as any
            ).stats.totalExpenses,
          )
            .plus(newConvertedAmount)
            .toString();
        newCalendarData.stats[newYear].stats.totalExpenses = new Decimal(
          newCalendarData.stats[newYear].stats.totalExpenses,
        )
          .plus(newConvertedAmount)
          .toString();
      }

      // Recalculate net for new stats
      (newCalendarData.stats[newYear][newMonth] as any)[newDay].net =
        new Decimal(
          (newCalendarData.stats[newYear][newMonth] as any)[newDay].totalIncome,
        )
          .minus(
            (newCalendarData.stats[newYear][newMonth] as any)[newDay]
              .totalExpenses,
          )
          .toString();
      (newCalendarData.stats[newYear][newMonth] as any).stats.net = new Decimal(
        (newCalendarData.stats[newYear][newMonth] as any).stats.totalIncome,
      )
        .minus(
          (newCalendarData.stats[newYear][newMonth] as any).stats.totalExpenses,
        )
        .toString();
      newCalendarData.stats[newYear].stats.net = new Decimal(
        newCalendarData.stats[newYear].stats.totalIncome,
      )
        .minus(newCalendarData.stats[newYear].stats.totalExpenses)
        .toString();
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
    loading,
    error,
    loadCalendarV2,
    updateCalendarCellEvent,
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
