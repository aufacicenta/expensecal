"use client";

import { GetCalendarV2SuccessResponse } from "@/app/api/v2/calendar/types";
import { useExchangeRatesContext } from "@/context/ExchangeRates/useExchangeRatesContext";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { convertAmount } from "@/lib/calendar/stats";
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
  const exchangeRatesContext = useExchangeRatesContext();
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
      let dayStillHasEvents =
        newCalendarData.calendar[year][month][day].length > 0;
      if (!dayStillHasEvents) {
        delete newCalendarData.calendar[year][month][day];
        delete (newCalendarData.stats[year][month] as any)[day];
      }

      // Update stats - only if day still exists
      if (dayStillHasEvents) {
        if (deletedEvent.type === "INCOME") {
          (newCalendarData.stats[year][month] as any)[day].totalIncome =
            new Decimal(
              (newCalendarData.stats[year][month] as any)[day].totalIncome,
            )
              .minus(deletedConvertedAmount)
              .toString();
          (newCalendarData.stats[year][month] as any).stats.totalIncome =
            new Decimal(
              (newCalendarData.stats[year][month] as any).stats.totalIncome,
            )
              .minus(deletedConvertedAmount)
              .toString();
          newCalendarData.stats[year].stats.totalIncome = new Decimal(
            newCalendarData.stats[year].stats.totalIncome,
          )
            .minus(deletedConvertedAmount)
            .toString();
        } else if (deletedEvent.type === "EXPENSE") {
          (newCalendarData.stats[year][month] as any)[day].totalExpenses =
            new Decimal(
              (newCalendarData.stats[year][month] as any)[day].totalExpenses,
            )
              .minus(deletedConvertedAmount)
              .toString();
          (newCalendarData.stats[year][month] as any).stats.totalExpenses =
            new Decimal(
              (newCalendarData.stats[year][month] as any).stats.totalExpenses,
            )
              .minus(deletedConvertedAmount)
              .toString();
          newCalendarData.stats[year].stats.totalExpenses = new Decimal(
            newCalendarData.stats[year].stats.totalExpenses,
          )
            .minus(deletedConvertedAmount)
            .toString();
        }

        // Recalculate net for day, month, and year
        (newCalendarData.stats[year][month] as any)[day].net = new Decimal(
          (newCalendarData.stats[year][month] as any)[day].totalIncome,
        )
          .minus((newCalendarData.stats[year][month] as any)[day].totalExpenses)
          .toString();
      } else {
        // Day is empty - subtract stats without day-level calculation
        if (deletedEvent.type === "INCOME") {
          (newCalendarData.stats[year][month] as any).stats.totalIncome =
            new Decimal(
              (newCalendarData.stats[year][month] as any).stats.totalIncome,
            )
              .minus(deletedConvertedAmount)
              .toString();
          newCalendarData.stats[year].stats.totalIncome = new Decimal(
            newCalendarData.stats[year].stats.totalIncome,
          )
            .minus(deletedConvertedAmount)
            .toString();
        } else if (deletedEvent.type === "EXPENSE") {
          (newCalendarData.stats[year][month] as any).stats.totalExpenses =
            new Decimal(
              (newCalendarData.stats[year][month] as any).stats.totalExpenses,
            )
              .minus(deletedConvertedAmount)
              .toString();
          newCalendarData.stats[year].stats.totalExpenses = new Decimal(
            newCalendarData.stats[year].stats.totalExpenses,
          )
            .minus(deletedConvertedAmount)
            .toString();
        }
      }

      // Recalculate net for month and year
      (newCalendarData.stats[year][month] as any).stats.net = new Decimal(
        (newCalendarData.stats[year][month] as any).stats.totalIncome,
      )
        .minus((newCalendarData.stats[year][month] as any).stats.totalExpenses)
        .toString();
      newCalendarData.stats[year].stats.net = new Decimal(
        newCalendarData.stats[year].stats.totalIncome,
      )
        .minus(newCalendarData.stats[year].stats.totalExpenses)
        .toString();

      // Apply carry-forward cascade from the affected year onwards
      const allYears = Object.keys(newCalendarData.stats).sort();
      const startYearIdx = allYears.indexOf(year);
      if (startYearIdx === -1) return false;

      let prevYearNet: string | undefined;
      if (startYearIdx > 0) {
        prevYearNet =
          newCalendarData.stats[allYears[startYearIdx - 1]].stats.net;
      }

      for (let yearIdx = startYearIdx; yearIdx < allYears.length; yearIdx++) {
        const yearData = newCalendarData.stats[allYears[yearIdx]];

        // Add previous year's net to current year's income
        if (prevYearNet !== undefined) {
          yearData.stats.totalIncome = new Decimal(yearData.stats.totalIncome)
            .plus(prevYearNet)
            .toString();
        }

        // Recalculate year net
        yearData.stats.net = new Decimal(yearData.stats.totalIncome)
          .minus(yearData.stats.totalExpenses)
          .toString();

        prevYearNet = yearData.stats.net;

        // Process months
        const months = Object.keys(yearData)
          .filter((k) => k !== "stats")
          .sort();

        const startMonthIdx =
          yearIdx === startYearIdx ? months.indexOf(month) : 0;
        let prevMonthNet: string | undefined;

        if (startMonthIdx > 0) {
          prevMonthNet = (yearData[months[startMonthIdx - 1]] as any).stats.net;
        }

        for (
          let monthIdx = startMonthIdx;
          monthIdx < months.length;
          monthIdx++
        ) {
          const monthData = yearData[months[monthIdx]] as any;

          // Add previous month's net to current month's income
          if (prevMonthNet !== undefined) {
            monthData.stats.totalIncome = new Decimal(
              monthData.stats.totalIncome,
            )
              .plus(prevMonthNet)
              .toString();
          }

          // Recalculate month net
          monthData.stats.net = new Decimal(monthData.stats.totalIncome)
            .minus(monthData.stats.totalExpenses)
            .toString();

          prevMonthNet = monthData.stats.net;

          // Process days
          const days = Object.keys(monthData)
            .filter((k) => k !== "stats")
            .sort();

          let startDayIdx = 0;
          if (yearIdx === startYearIdx && monthIdx === startMonthIdx) {
            const dayIndex = days.indexOf(day);
            // If day was deleted, start from 0; otherwise start from that day
            startDayIdx = dayIndex === -1 ? 0 : dayIndex;
          }

          let prevDayNet: string | undefined;

          if (startDayIdx > 0) {
            prevDayNet = monthData[days[startDayIdx - 1]].net;
          }

          for (let dayIdx = startDayIdx; dayIdx < days.length; dayIdx++) {
            const dayStats = monthData[days[dayIdx]];

            // Add previous day's net to current day's income
            if (prevDayNet !== undefined) {
              dayStats.totalIncome = new Decimal(dayStats.totalIncome)
                .plus(prevDayNet)
                .toString();
            }

            // Recalculate day net
            dayStats.net = new Decimal(dayStats.totalIncome)
              .minus(dayStats.totalExpenses)
              .toString();

            prevDayNet = dayStats.net;
          }
        }
      }

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

        // Check if day is now empty
        const oldDayStillHasEvents =
          newCalendarData.calendar[oldYear][oldMonth][oldDay].length > 0;
        if (!oldDayStillHasEvents) {
          delete newCalendarData.calendar[oldYear][oldMonth][oldDay];
          delete (newCalendarData.stats[oldYear][oldMonth] as any)[oldDay];
        }

        // Subtract old event's contribution from old stats using latest rates
        const oldConvertedAmount = recalculateConvertedAmount(oldEvent);
        if (oldEvent.type === "INCOME") {
          if (oldDayStillHasEvents) {
            newCalendarData.stats[oldYear][oldMonth][oldDay].totalIncome =
              new Decimal(
                newCalendarData.stats[oldYear][oldMonth][oldDay].totalIncome,
              )
                .minus(oldConvertedAmount)
                .toString();
          }
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
          if (oldDayStillHasEvents) {
            newCalendarData.stats[oldYear][oldMonth][oldDay].totalExpenses =
              new Decimal(
                newCalendarData.stats[oldYear][oldMonth][oldDay].totalExpenses,
              )
                .minus(oldConvertedAmount)
                .toString();
          }
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

        // Recalculate net for old stats (only if day still exists)
        if (oldDayStillHasEvents) {
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
        }
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
        // Same day - recalculate exchangeRate and update stats
        const oldEvent =
          newCalendarData.calendar[oldYear][oldMonth][oldDay][oldEventIndex];
        const oldConvertedAmount = recalculateConvertedAmount(oldEvent);
        const newConvertedAmount = recalculateConvertedAmount(updatedEvent);

        // Subtract old amount from stats at all levels
        if (oldEvent.type === "INCOME") {
          (newCalendarData.stats[oldYear][oldMonth] as any)[
            oldDay
          ].totalIncome = new Decimal(
            (newCalendarData.stats[oldYear][oldMonth] as any)[
              oldDay
            ].totalIncome,
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
          (newCalendarData.stats[oldYear][oldMonth] as any)[
            oldDay
          ].totalExpenses = new Decimal(
            (newCalendarData.stats[oldYear][oldMonth] as any)[
              oldDay
            ].totalExpenses,
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

        // Add new amount to stats at all levels
        if (updatedEvent.type === "INCOME") {
          (newCalendarData.stats[oldYear][oldMonth] as any)[
            oldDay
          ].totalIncome = new Decimal(
            (newCalendarData.stats[oldYear][oldMonth] as any)[
              oldDay
            ].totalIncome,
          )
            .plus(newConvertedAmount)
            .toString();
          (newCalendarData.stats[oldYear][oldMonth] as any).stats.totalIncome =
            new Decimal(
              (
                newCalendarData.stats[oldYear][oldMonth] as any
              ).stats.totalIncome,
            )
              .plus(newConvertedAmount)
              .toString();
          newCalendarData.stats[oldYear].stats.totalIncome = new Decimal(
            newCalendarData.stats[oldYear].stats.totalIncome,
          )
            .plus(newConvertedAmount)
            .toString();
        } else if (updatedEvent.type === "EXPENSE") {
          (newCalendarData.stats[oldYear][oldMonth] as any)[
            oldDay
          ].totalExpenses = new Decimal(
            (newCalendarData.stats[oldYear][oldMonth] as any)[
              oldDay
            ].totalExpenses,
          )
            .plus(newConvertedAmount)
            .toString();
          (
            newCalendarData.stats[oldYear][oldMonth] as any
          ).stats.totalExpenses = new Decimal(
            (
              newCalendarData.stats[oldYear][oldMonth] as any
            ).stats.totalExpenses,
          )
            .plus(newConvertedAmount)
            .toString();
          newCalendarData.stats[oldYear].stats.totalExpenses = new Decimal(
            newCalendarData.stats[oldYear].stats.totalExpenses,
          )
            .plus(newConvertedAmount)
            .toString();
        }

        // Recalculate net for day, month, and year
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

        // Update exchangeRate and update the event in place
        updatedEvent.exchangeRate = newConvertedAmount.toString();
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

      // Recalculate exchange rate for the updated event using latest rates
      const recalculatedExchangeRate = recalculateConvertedAmount(updatedEvent);
      updatedEvent.exchangeRate = recalculatedExchangeRate.toString();

      // Add updated event to new location
      newCalendarData.calendar[newYear][newMonth][newDay].push(updatedEvent);

      // Add new event's contribution to new stats using recalculated amount
      const newConvertedAmount = recalculatedExchangeRate;
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

    // Helper function to recalculate base stats and apply full carry-forward cascade
    const applyCascadeFromAffectedPeriod = () => {
      // Determine the starting year for cascade
      // (could be oldYear for same-day, or min(oldYear, newYear) for cross-day)
      let cascadeStartYear = oldYear;
      if (oldDateStr !== newDateStr && newYear < oldYear) {
        cascadeStartYear = newYear;
      }

      // Step 1: Recalculate base stats for affected month from calendar events
      const affectedMonthsToClear =
        oldDateStr !== newDateStr
          ? [oldMonth, newMonth] // Both months affected in cross-day update
          : [oldMonth]; // Only one month in same-day update

      for (const monthToClear of affectedMonthsToClear) {
        const yearForMonth =
          oldDateStr !== newDateStr && monthToClear === newMonth
            ? newYear
            : oldYear;
        if (!newCalendarData.calendar[yearForMonth]?.[monthToClear]) continue;

        const monthDays = Object.keys(
          newCalendarData.calendar[yearForMonth][monthToClear],
        ).sort();
        for (const day of monthDays) {
          const dayEvents =
            newCalendarData.calendar[yearForMonth][monthToClear][day] || [];
          let dayIncome = new Decimal(0);
          let dayExpenses = new Decimal(0);

          for (const event of dayEvents) {
            const convertedAmount = new Decimal(event.exchangeRate);
            if (event.type === "INCOME") {
              dayIncome = dayIncome.plus(convertedAmount);
            } else if (event.type === "EXPENSE") {
              dayExpenses = dayExpenses.plus(convertedAmount);
            }
          }

          // Ensure day stats object exists before updating
          if (
            !(newCalendarData.stats[yearForMonth][monthToClear] as any)[day]
          ) {
            (newCalendarData.stats[yearForMonth][monthToClear] as any)[day] = {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            };
          }

          (newCalendarData.stats[yearForMonth][monthToClear] as any)[
            day
          ].totalIncome = dayIncome.toString();
          (newCalendarData.stats[yearForMonth][monthToClear] as any)[
            day
          ].totalExpenses = dayExpenses.toString();
        }
      }

      // Step 2: Recalculate month-level stats from day stats
      for (const monthToClear of affectedMonthsToClear) {
        const yearForMonth =
          oldDateStr !== newDateStr && monthToClear === newMonth
            ? newYear
            : oldYear;
        if (!newCalendarData.stats[yearForMonth]?.[monthToClear]) continue;

        let monthIncome = new Decimal(0);
        let monthExpenses = new Decimal(0);

        const monthDays = Object.keys(
          newCalendarData.stats[yearForMonth][monthToClear] as any,
        )
          .filter((k) => k !== "stats")
          .sort();

        for (const day of monthDays) {
          const dayStats = (
            newCalendarData.stats[yearForMonth][monthToClear] as any
          )[day];
          monthIncome = monthIncome.plus(dayStats.totalIncome);
          monthExpenses = monthExpenses.plus(dayStats.totalExpenses);
        }

        (
          newCalendarData.stats[yearForMonth][monthToClear] as any
        ).stats.totalIncome = monthIncome.toString();
        (
          newCalendarData.stats[yearForMonth][monthToClear] as any
        ).stats.totalExpenses = monthExpenses.toString();
      }

      // Step 3: Recalculate year-level stats
      const affectedYears = new Set<string>();
      affectedYears.add(oldYear);
      if (oldDateStr !== newDateStr) {
        affectedYears.add(newYear);
      }

      for (const yearToRecalc of Array.from(affectedYears).sort()) {
        let yearIncome = new Decimal(0);
        let yearExpenses = new Decimal(0);

        const yearMonths = Object.keys(newCalendarData.stats[yearToRecalc])
          .filter((k) => k !== "stats")
          .sort();

        for (const month of yearMonths) {
          const monthStats = (newCalendarData.stats[yearToRecalc][month] as any)
            .stats;
          yearIncome = yearIncome.plus(monthStats.totalIncome);
          yearExpenses = yearExpenses.plus(monthStats.totalExpenses);
        }

        newCalendarData.stats[yearToRecalc].stats.totalIncome =
          yearIncome.toString();
        newCalendarData.stats[yearToRecalc].stats.totalExpenses =
          yearExpenses.toString();
      }

      // Step 4: Apply carry-forward cascade from the affected year onwards
      const allYears = Object.keys(newCalendarData.stats).sort();
      const startYearIdx = allYears.indexOf(cascadeStartYear);
      if (startYearIdx === -1) return;

      let prevYearNet: string | undefined;
      if (startYearIdx > 0) {
        prevYearNet =
          newCalendarData.stats[allYears[startYearIdx - 1]].stats.net;
      }

      for (let yearIdx = startYearIdx; yearIdx < allYears.length; yearIdx++) {
        const year = allYears[yearIdx];
        const yearData = newCalendarData.stats[year];
        const isStartYear = yearIdx === startYearIdx;

        // Add previous year's net to current year's income
        if (prevYearNet !== undefined) {
          yearData.stats.totalIncome = new Decimal(yearData.stats.totalIncome)
            .plus(prevYearNet)
            .toString();
        }

        // Recalculate year net
        yearData.stats.net = new Decimal(yearData.stats.totalIncome)
          .minus(yearData.stats.totalExpenses)
          .toString();

        prevYearNet = yearData.stats.net;

        // Process months
        const months = Object.keys(yearData)
          .filter((k) => k !== "stats")
          .sort();

        const startMonthIdx = isStartYear
          ? months.indexOf(cascadeStartYear === oldYear ? oldMonth : newMonth)
          : 0;
        let prevMonthNet: string | undefined;

        if (startMonthIdx > 0) {
          prevMonthNet = (yearData[months[startMonthIdx - 1]] as any).stats.net;
        }

        for (
          let monthIdx = startMonthIdx;
          monthIdx < months.length;
          monthIdx++
        ) {
          const month = months[monthIdx];
          const monthData = yearData[month] as any;

          // Add previous month's net to current month's income
          if (prevMonthNet !== undefined) {
            monthData.stats.totalIncome = new Decimal(
              monthData.stats.totalIncome,
            )
              .plus(prevMonthNet)
              .toString();
          }

          // Recalculate month net
          monthData.stats.net = new Decimal(monthData.stats.totalIncome)
            .minus(monthData.stats.totalExpenses)
            .toString();

          prevMonthNet = monthData.stats.net;

          // Process days
          const days = Object.keys(monthData)
            .filter((k) => k !== "stats")
            .sort();

          const startDayIdx =
            isStartYear && monthIdx === startMonthIdx
              ? days.indexOf(cascadeStartYear === oldYear ? oldDay : newDay)
              : 0;

          let prevDayNet: string | undefined;

          if (startDayIdx > 0) {
            const prevDay = monthData[days[startDayIdx - 1]];
            if (prevDay) {
              prevDayNet = prevDay.net;
            }
          }

          for (let dayIdx = startDayIdx; dayIdx < days.length; dayIdx++) {
            const day = days[dayIdx];
            const dayStats = monthData[day];

            // Skip if day stats doesn't exist
            if (!dayStats) continue;

            // Add previous day's net to current day's income
            if (prevDayNet !== undefined) {
              dayStats.totalIncome = new Decimal(dayStats.totalIncome)
                .plus(prevDayNet)
                .toString();
            }

            // Recalculate day net
            dayStats.net = new Decimal(dayStats.totalIncome)
              .minus(dayStats.totalExpenses)
              .toString();

            prevDayNet = dayStats.net;
          }
        }
      }
    };

    // Apply the carry-forward cascade to ensure all subsequent periods have correct stats
    applyCascadeFromAffectedPeriod();

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
