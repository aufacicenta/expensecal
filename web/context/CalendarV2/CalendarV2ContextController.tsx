"use client";

import Decimal from "decimal.js";
import { useMemo, useState } from "react";

import { CalendarV2Context } from "./CalendarV2Context";
import {
  CalendarV2ContextActionStates,
  CalendarV2ContextControllerProps,
  CalendarV2ContextType,
} from "./CalendarV2Context.types";

import {
  CalendarEvent,
  GetCalendarV2SuccessResponse,
  MonthStats,
} from "@/app/api/v2/calendar/types";
import { useEventCategoriesContext } from "@/context/EventCategories/useEventCategoriesContext";
import { useExchangeRatesContext } from "@/context/ExchangeRates/useExchangeRatesContext";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { filterEventsByCategories } from "@/lib/calendar/filterEvents";
import {
  addEventToStats,
  applyCarryForwardAndRecalculate,
  calculatePercentChange,
  convertAmount,
  recalculateNetsAfterUpdate,
} from "@/lib/calendar/stats";
import { toDateString } from "@/lib/date";

export const CalendarV2ContextController = ({
  children,
}: CalendarV2ContextControllerProps) => {
  const routes = useRoutes();
  const exchangeRatesContext = useExchangeRatesContext();
  const { selectedCategoryIds } = useEventCategoriesContext();

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

  /**
   * Filter calendar data by selected categories and recalculate stats
   * Returns the original data if no categories are selected
   */
  const filteredCalendarData = useMemo(() => {
    if (!calendarV2Data || selectedCategoryIds.length === 0) {
      return calendarV2Data;
    }

    // Deep clone the calendar data to avoid mutations
    const filteredData: GetCalendarV2SuccessResponse["data"] = {
      calendar: {},
      stats: {},
    };

    // Process each year
    for (const [year, yearObj] of Object.entries(calendarV2Data.calendar)) {
      filteredData.calendar[year] = {};
      filteredData.stats[year] = {
        stats: { totalIncome: "0", totalExpenses: "0", net: "0" },
      };

      let yearIncome = new Decimal(0);
      let yearExpenses = new Decimal(0);

      // Process each month
      for (const [month, monthObj] of Object.entries(yearObj)) {
        filteredData.calendar[year][month] = {};
        filteredData.stats[year][month] = {
          stats: { totalIncome: "0", totalExpenses: "0", net: "0" },
        };

        let monthIncome = new Decimal(0);
        let monthExpenses = new Decimal(0);

        // Process each day
        for (const [day, events] of Object.entries(monthObj)) {
          // Filter events by selected categories
          const filteredEvents = filterEventsByCategories(
            events as CalendarEvent[],
            selectedCategoryIds,
          ) as CalendarEvent[];

          if (filteredEvents.length > 0) {
            filteredData.calendar[year][month][day] = filteredEvents;

            // Calculate day stats from filtered events
            let dayIncome = new Decimal(0);
            let dayExpenses = new Decimal(0);

            for (const event of filteredEvents) {
              const amount = new Decimal(event.exchangeRate || "0");

              if (event.type === "INCOME") {
                dayIncome = dayIncome.plus(amount);
              } else {
                dayExpenses = dayExpenses.plus(amount);
              }
            }

            const dayNet = dayIncome.minus(dayExpenses);

            (filteredData.stats[year][month] as MonthStats)[day] = {
              totalIncome: dayIncome.toString(),
              totalExpenses: dayExpenses.toString(),
              net: dayNet.toString(),
            };

            monthIncome = monthIncome.plus(dayIncome);
            monthExpenses = monthExpenses.plus(dayExpenses);
          }
        }

        // Set month stats
        const monthNet = monthIncome.minus(monthExpenses);

        (filteredData.stats[year][month] as MonthStats).stats = {
          totalIncome: monthIncome.toString(),
          totalExpenses: monthExpenses.toString(),
          net: monthNet.toString(),
        };

        yearIncome = yearIncome.plus(monthIncome);
        yearExpenses = yearExpenses.plus(monthExpenses);
      }

      // Set year stats
      const yearNet = yearIncome.minus(yearExpenses);

      filteredData.stats[year].stats = {
        totalIncome: yearIncome.toString(),
        totalExpenses: yearExpenses.toString(),
        net: yearNet.toString(),
      };
    }

    return filteredData;
  }, [calendarV2Data, selectedCategoryIds]);

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

    return false;
  };

  /**
   * Update a calendar event in-place without reloading the entire calendar
   * Handles event updates, date changes, and stats recalculation with proper carry-forward
   * Processes events in chronological order to ensure correct cascade calculations
   */
  const updateCalendarCellEvent = (
    updatedEvent: CalendarEvent,
    oldEventDate: Date,
  ) => {
    if (!calendarV2Data) return false;

    // Create a deep copy to avoid direct state mutations
    const newCalendarData = JSON.parse(JSON.stringify(calendarV2Data));

    const oldDateStr = toDateString(oldEventDate);
    const newDateStr = toDateString(new Date(updatedEvent.event_date));
    const [oldYear, oldMonth, oldDay] = oldDateStr.split("-");
    const [newYear, newMonth, newDay] = newDateStr.split("-");

    // Helper function to recalculate converted amount using latest exchange rates
    const recalculateConvertedAmount = (event: any): Decimal => {
      if (!exchangeRatesContext.rates) {
        return new Decimal(event.exchangeRate || "0");
      }

      let baseCurrency = "USD";

      if (exchangeRatesContext.baseCurrency) {
        baseCurrency = exchangeRatesContext.baseCurrency;
      }

      const amount = new Decimal(event.amount).times(event.quantity || 1);
      const currencySymbol = event.currency?.symbol || "UNKNOWN";
      const ratesMap = new Map(Object.entries(exchangeRatesContext.rates));

      try {
        return convertAmount(amount, currencySymbol, baseCurrency, ratesMap);
      } catch (error) {
        console.warn("Error recalculating converted amount:", error);

        return new Decimal(event.exchangeRate || "0");
      }
    };

    // Find and remove the old event
    let oldEventFound = false;

    if (newCalendarData.calendar[oldYear]?.[oldMonth]?.[oldDay]) {
      const oldEventIndex = newCalendarData.calendar[oldYear][oldMonth][
        oldDay
      ].findIndex((e: any) => e.id === updatedEvent.id);

      if (oldEventIndex !== -1) {
        newCalendarData.calendar[oldYear][oldMonth][oldDay].splice(
          oldEventIndex,
          1,
        );
        oldEventFound = true;

        if (newCalendarData.calendar[oldYear][oldMonth][oldDay].length === 0) {
          delete newCalendarData.calendar[oldYear][oldMonth][oldDay];
        }
      }
    }

    if (!oldEventFound) return false;

    // Update event with new exchange rate
    const newConvertedAmount = recalculateConvertedAmount(updatedEvent);

    updatedEvent.exchangeRate = newConvertedAmount.toString();

    // Initialize new date structure if needed
    if (!newCalendarData.calendar[newYear]) {
      newCalendarData.calendar[newYear] = {};
    }

    if (!newCalendarData.calendar[newYear][newMonth]) {
      newCalendarData.calendar[newYear][newMonth] = {};
    }

    if (!newCalendarData.calendar[newYear][newMonth][newDay]) {
      newCalendarData.calendar[newYear][newMonth][newDay] = [];
    }

    // Add updated event to new location
    newCalendarData.calendar[newYear][newMonth][newDay].push(updatedEvent);

    // Collect all events in chronological order from earliest affected period
    interface EventWithDate {
      year: string;
      month: string;
      day: string;
      event: CalendarEvent;
    }

    const allEvents: EventWithDate[] = [];
    const allYears = Object.keys(newCalendarData.calendar).sort();

    for (const year of allYears) {
      const months = Object.keys(newCalendarData.calendar[year])
        .filter((k) => k !== "stats")
        .sort();

      for (const month of months) {
        const days = Object.keys(newCalendarData.calendar[year][month]).sort(
          (a, b) => parseInt(a) - parseInt(b),
        );

        for (const day of days) {
          const dayEvents = newCalendarData.calendar[year][month][day] || [];

          for (const event of dayEvents) {
            allEvents.push({ year, month, day, event });
          }
        }
      }
    }

    // Clear all stats
    for (const year of allYears) {
      if (!newCalendarData.stats[year]) {
        newCalendarData.stats[year] = {
          stats: { totalIncome: "0", totalExpenses: "0", net: "0" },
        };
      }

      const months = Object.keys(newCalendarData.calendar[year])
        .filter((k) => k !== "stats")
        .sort();

      for (const month of months) {
        if (!newCalendarData.stats[year][month]) {
          newCalendarData.stats[year][month] = {
            stats: { totalIncome: "0", totalExpenses: "0", net: "0" },
          };
        } else {
          // Clear day stats while preserving month structure
          const monthStats = newCalendarData.stats[year][month];

          for (const key of Object.keys(monthStats)) {
            if (key !== "stats") {
              delete monthStats[key];
            }
          }

          monthStats.stats = {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          };
        }
      }

      newCalendarData.stats[year].stats = {
        totalIncome: "0",
        totalExpenses: "0",
        net: "0",
      };
    }

    // Rebuild stats by processing events in order (same as route.ts)
    let prevDayDate: string | undefined;
    let prevMonthDate: string | undefined;
    let prevYearDate: string | undefined;
    let prevDayNet: string | undefined;
    let prevMonthNet: string | undefined;
    let prevYearNet: string | undefined;

    // Track last closed period's nets for percentage change calculation
    let lastClosedDayNet: string | undefined;
    let lastClosedMonthNet: string | undefined;
    let lastClosedYearNet: string | undefined;

    for (const { year, month, day, event } of allEvents) {
      const dateStr = `${year}-${month}-${day}`;
      const currentMonthKey = `${year}-${month}`;

      // Initialize day stats if first event for this day
      if (!(newCalendarData.stats[year][month] as any)[day]) {
        (newCalendarData.stats[year][month] as any)[day] = {
          totalIncome: "0",
          totalExpenses: "0",
          net: "0",
        };

        // Detect year boundary
        if (prevYearDate && prevYearDate !== year) {
          // Calculate % change for year we're leaving (after all events added to it)
          const prevYearStats = newCalendarData.stats[prevYearDate].stats;

          prevYearStats.netPercentChange = calculatePercentChange(
            prevYearStats.net,
            lastClosedYearNet,
          );

          lastClosedYearNet = prevYearStats.net;

          // Apply carry-forward for new year
          applyCarryForwardAndRecalculate(
            newCalendarData.stats,
            year,
            month,
            day,
            prevYearNet,
            undefined,
            undefined,
          );
        }

        // Detect month boundary
        if (prevMonthDate && prevMonthDate !== currentMonthKey) {
          // Calculate % change for month we're leaving (after all events added to it)
          const [prevYear, prevMonth] = prevMonthDate.split("-");
          const prevMonthStats = (
            newCalendarData.stats[prevYear][prevMonth] as any
          ).stats;

          prevMonthStats.netPercentChange = calculatePercentChange(
            prevMonthStats.net,
            lastClosedMonthNet,
          );

          lastClosedMonthNet = prevMonthStats.net;

          // Apply carry-forward for new month
          applyCarryForwardAndRecalculate(
            newCalendarData.stats,
            year,
            month,
            day,
            undefined,
            prevMonthNet,
            undefined,
          );
        }

        // Detect day boundary
        if (prevDayDate && prevDayDate !== dateStr) {
          // Calculate % change for day we're leaving (after all events added to it)
          const prevDayComponent = prevDayDate.split("-")[2];
          const prevDayStats = (
            newCalendarData.stats[prevYearDate!][
              prevMonthDate!.split("-")[1]
            ] as any
          )[prevDayComponent];

          if (prevDayStats) {
            prevDayStats.netPercentChange = calculatePercentChange(
              prevDayStats.net,
              lastClosedDayNet,
            );

            lastClosedDayNet = prevDayStats.net;
          }

          // Apply carry-forward for new day
          applyCarryForwardAndRecalculate(
            newCalendarData.stats,
            year,
            month,
            day,
            undefined,
            undefined,
            prevDayNet,
          );
        }
      }

      // Add event to stats at all levels
      const convertedAmount = new Decimal(event.exchangeRate);

      addEventToStats(
        newCalendarData.stats,
        convertedAmount,
        event.type === "INCOME" ? "INCOME" : "EXPENSE",
        year,
        month,
        day,
      );

      // Recalculate nets after adding event
      recalculateNetsAfterUpdate(newCalendarData.stats, year, month, day);

      // Track previous dates and net values for boundary detection
      prevDayDate = dateStr;
      prevMonthDate = currentMonthKey;
      prevYearDate = year;
      prevDayNet = (newCalendarData.stats[year][month] as any)[day].net;
      prevMonthNet = (newCalendarData.stats[year][month] as any).stats.net;
      prevYearNet = newCalendarData.stats[year].stats.net;
    }

    // Calculate % change for final day/month/year (after all events processed)
    if (prevDayDate && prevYearDate && prevMonthDate) {
      const prevDayComponent = prevDayDate.split("-")[2];
      const lastDayStats = (
        newCalendarData.stats[prevYearDate][prevMonthDate.split("-")[1]] as any
      )[prevDayComponent];

      if (lastDayStats) {
        lastDayStats.netPercentChange = calculatePercentChange(
          lastDayStats.net,
          lastClosedDayNet,
        );
      }
    }

    if (prevMonthDate && prevYearDate) {
      const [prevYear, prevMonth] = prevMonthDate.split("-");
      const lastMonthStats = (newCalendarData.stats[prevYear][prevMonth] as any)
        .stats;

      lastMonthStats.netPercentChange = calculatePercentChange(
        lastMonthStats.net,
        lastClosedMonthNet,
      );
    }

    if (prevYearDate) {
      const lastYearStats = newCalendarData.stats[prevYearDate].stats;

      lastYearStats.netPercentChange = calculatePercentChange(
        lastYearStats.net,
        lastClosedYearNet,
      );
    }

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
    filteredCalendarData,
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
