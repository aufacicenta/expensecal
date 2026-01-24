"use client";

import Decimal from "decimal.js";
import { useCallback, useMemo, useState } from "react";

import { CalendarV2Context } from "./CalendarV2Context";
import {
  CalendarV2ContextActionStates,
  CalendarV2ContextControllerProps,
  CalendarV2ContextType,
} from "./CalendarV2Context.types";

import {
  CalendarData,
  CalendarEvent,
  CalendarStatsData,
  GetCalendarV2SuccessResponse,
  MonthStats,
  ProcessedCalendarData,
  RawCalendarEvent,
} from "@/app/api/v2/calendar/types";
import { useEventCategoriesContext } from "@/context/EventCategories/useEventCategoriesContext";
import { useExchangeRatesContext } from "@/context/ExchangeRates/useExchangeRatesContext";
import { useUserPreferencesContext } from "@/context/UserPreferences/useUserPreferencesContext";
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
  const { baseCurrency: userBaseCurrency } = useUserPreferencesContext();
  const { selectedCategoryIds } = useEventCategoriesContext();

  // Store raw events from API - processing happens in useMemo
  const [rawEvents, setRawEvents] = useState<RawCalendarEvent[] | undefined>(
    undefined,
  );
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [actionStates, setActionStates] =
    useState<CalendarV2ContextActionStates>({
      loadCalendarV2: {
        isLoading: true,
        error: undefined,
      },
    });

  /**
   * Process raw events into calendar structure with stats
   * This is the core client-side calculation that replaces server-side processing
   * Uses exchange rates from ExchangeRatesContext
   */
  const processEventsIntoCalendar = useCallback(
    (
      events: RawCalendarEvent[],
      rates: Record<string, string> | undefined,
      targetBaseCurrency: string,
    ): ProcessedCalendarData => {
      const calendarData: CalendarData = {};
      const stats: CalendarStatsData = {};

      // Create exchange rates map for convertAmount function
      const exchangeRates = new Map<string, string>(
        rates ? Object.entries(rates) : [],
      );

      // Track previous periods for boundary detection, carry-forward, and percentage calculations
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

      for (const event of events) {
        const dateStr = toDateString(event.event_date);
        const [year, month, day] = dateStr.split("-");
        const currentMonthKey = `${year}-${month}`;

        // Initialize year structure if not exists
        if (!calendarData[year]) {
          calendarData[year] = {};
          stats[year] = {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          };
        }

        // Initialize month structure if not exists
        if (!calendarData[year][month]) {
          calendarData[year][month] = {};
          stats[year][month] = {
            stats: {
              totalIncome: "0",
              totalExpenses: "0",
              net: "0",
            },
          };
        }

        // Initialize day structure if not exists
        if (!calendarData[year][month][day]) {
          calendarData[year][month][day] = [];
          (stats[year][month] as MonthStats)[day] = {
            totalIncome: "0",
            totalExpenses: "0",
            net: "0",
          };

          // Detect year boundary
          if (prevYearDate && prevYearDate !== year) {
            const prevYearStats = stats[prevYearDate].stats;

            prevYearStats.netPercentChange = calculatePercentChange(
              prevYearStats.net,
              lastClosedYearNet,
            );

            lastClosedYearNet = prevYearStats.net;

            applyCarryForwardAndRecalculate(
              stats,
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
            const [prevYear, prevMonth] = prevMonthDate.split("-");
            const prevMonthStats = (stats[prevYear][prevMonth] as MonthStats)
              .stats;

            prevMonthStats.netPercentChange = calculatePercentChange(
              prevMonthStats.net,
              lastClosedMonthNet,
            );

            lastClosedMonthNet = prevMonthStats.net;

            applyCarryForwardAndRecalculate(
              stats,
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
            const prevDayComponent = prevDayDate.split("-")[2];
            const prevDayStats = (
              stats[prevYearDate!][prevMonthDate!.split("-")[1]] as MonthStats
            )[prevDayComponent];

            if (prevDayStats) {
              prevDayStats.netPercentChange = calculatePercentChange(
                prevDayStats.net,
                lastClosedDayNet,
              );

              lastClosedDayNet = prevDayStats.net;
            }

            applyCarryForwardAndRecalculate(
              stats,
              year,
              month,
              day,
              undefined,
              undefined,
              prevDayNet,
            );
          }
        }

        // Convert amount using exchange rates
        const amount = new Decimal(event.amount).times(event.quantity);
        const currencySymbol = event.currency?.symbol || "UNKNOWN";
        const convertedAmount = convertAmount(
          amount,
          currencySymbol,
          targetBaseCurrency,
          exchangeRates,
        );

        // Create calendar event with converted exchange rate
        const calendarEvent: CalendarEvent = {
          ...event,
          exchangeRate: convertedAmount.toString(),
        };

        // Add event to the day
        calendarData[year][month][day].push(calendarEvent);

        // Add event to stats at all levels
        addEventToStats(
          stats,
          convertedAmount,
          event.type === "INCOME" ? "INCOME" : "EXPENSE",
          year,
          month,
          day,
        );

        // Recalculate nets after adding event
        recalculateNetsAfterUpdate(stats, year, month, day);

        // Track previous dates and net values for boundary detection
        prevDayDate = dateStr;
        prevMonthDate = currentMonthKey;
        prevYearDate = year;
        prevDayNet = (stats[year][month] as MonthStats)[day].net;
        prevMonthNet = (stats[year][month] as MonthStats).stats.net;
        prevYearNet = stats[year].stats.net;
      }

      // Calculate % change for final day/month/year (after all events processed)
      if (prevDayDate && prevYearDate && prevMonthDate) {
        const prevDayComponent = prevDayDate.split("-")[2];
        const lastDayStats = (
          stats[prevYearDate][prevMonthDate.split("-")[1]] as MonthStats
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
        const lastMonthStats = (stats[prevYear][prevMonth] as MonthStats).stats;

        lastMonthStats.netPercentChange = calculatePercentChange(
          lastMonthStats.net,
          lastClosedMonthNet,
        );
      }

      if (prevYearDate) {
        const lastYearStats = stats[prevYearDate].stats;

        lastYearStats.netPercentChange = calculatePercentChange(
          lastYearStats.net,
          lastClosedYearNet,
        );
      }

      // Sort events within each day: INCOME first (highest to lowest), then EXPENSE (highest to lowest)
      for (const year of Object.keys(calendarData)) {
        for (const month of Object.keys(calendarData[year])) {
          for (const day of Object.keys(calendarData[year][month])) {
            calendarData[year][month][day].sort((a, b) => {
              // First, sort by type: INCOME before EXPENSE
              if (a.type !== b.type) {
                return a.type === "INCOME" ? -1 : 1;
              }

              // Within the same type, sort by amount descending (highest first)
              const amountA = new Decimal(a.exchangeRate || "0");
              const amountB = new Decimal(b.exchangeRate || "0");

              return amountB.minus(amountA).toNumber();
            });
          }
        }
      }

      return { calendar: calendarData, stats };
    },
    [],
  );

  /**
   * Processed calendar data - computed from raw events + exchange rates
   * Recalculates when raw events, exchange rates, or user's base currency preference changes
   */
  const calendarV2Data = useMemo<ProcessedCalendarData | undefined>(() => {
    if (!rawEvents) return undefined;

    // Use rates from context, fallback to empty if not loaded yet
    const rates = exchangeRatesContext.rates;
    // Use user's base currency preference (updates immediately when changed)
    // Fall back to exchangeRatesContext.baseCurrency or local state
    const effectiveBaseCurrency =
      userBaseCurrency?.symbol ||
      exchangeRatesContext.baseCurrency ||
      baseCurrency;

    return processEventsIntoCalendar(rawEvents, rates, effectiveBaseCurrency);
  }, [
    rawEvents,
    exchangeRatesContext.rates,
    exchangeRatesContext.baseCurrency,
    userBaseCurrency?.symbol,
    baseCurrency,
    processEventsIntoCalendar,
  ]);

  /**
   * Filter calendar data by selected categories and recalculate stats
   * Returns the original data if no categories are selected
   */
  const filteredCalendarData = useMemo(() => {
    if (!calendarV2Data || selectedCategoryIds.length === 0) {
      return calendarV2Data;
    }

    // Deep clone the calendar data to avoid mutations
    const filteredData: ProcessedCalendarData = {
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

        // Store raw events - processing happens in useMemo
        setRawEvents(successResponse.data.events);
        setBaseCurrency(successResponse.data.baseCurrency);
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
   * Remove a deleted event from the raw events array
   * Stats recalculation happens automatically via useMemo
   */
  const deleteCalendarCellEvent = (deletedEvent: any, _eventDate: Date) => {
    if (!rawEvents) return false;

    const eventIndex = rawEvents.findIndex((e) => e.id === deletedEvent.id);

    if (eventIndex === -1) return false;

    // Remove event from raw events array - processing happens in useMemo
    const newRawEvents = [...rawEvents];

    newRawEvents.splice(eventIndex, 1);
    setRawEvents(newRawEvents);

    return true;
  };

  /**
   * Update a calendar event in-place without reloading the entire calendar
   * Stats recalculation happens automatically via useMemo when rawEvents changes
   */
  const updateCalendarCellEvent = (
    updatedEvent: CalendarEvent,
    _oldEventDate: Date,
  ) => {
    if (!rawEvents) return false;

    // Find the event in raw events
    const eventIndex = rawEvents.findIndex((e) => e.id === updatedEvent.id);

    if (eventIndex === -1) return false;

    // Create updated raw event (strip exchangeRate as it's calculated in processing)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { exchangeRate: _exchangeRate, ...rawEventData } = updatedEvent;
    const updatedRawEvent: RawCalendarEvent = rawEventData;

    // Update raw events array - processing happens in useMemo
    const newRawEvents = [...rawEvents];

    newRawEvents[eventIndex] = updatedRawEvent;

    // Sort by event_date to maintain chronological order
    newRawEvents.sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
    );

    setRawEvents(newRawEvents);

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
