"use client";

import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { toDateString } from "@/lib/date/formatters";
import { EventAttributes } from "@expensecal/database/models/Event";
import { animate, createScope, Scope } from "animejs";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { CalendarV2Props } from "./CalendarV2.types";

interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  events: EventAttributes[];
}

export const CalendarV2: React.FC<CalendarV2Props> = ({ className }) => {
  const {
    calendarV2Data,
    currentMonth,
    loadCalendarV2,
    loading,
    goToPreviousMonth,
    goToNextMonth,
  } = useCalendarV2Context();

  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<Scope | null>(null);
  const previousMonthRef = useRef<Date | null>(null);

  useEffect(() => {
    // Load calendar data on mount
    // loadCalendarV2();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !gridRef.current) return;

    // Initialize anime scope for animations
    scopeRef.current = createScope({ root: containerRef.current }).add(
      (self) => {
        self?.add("animateGridTransition", (direction: number) => {
          if (!gridRef.current) return;

          // Set initial state
          animate(gridRef.current, {
            opacity: 0,
            translateX: direction * 100,
          });

          // Animate to final state
          animate(gridRef.current, {
            opacity: 1,
            translateX: 0,
            duration: 10000,
            easing: "easeInOutCubic",
          });
        });
      },
    );

    return () => {
      scopeRef.current?.revert();
    };
  }, []);

  // Animate grid when month changes
  useEffect(() => {
    if (previousMonthRef.current === null) {
      previousMonthRef.current = new Date(currentMonth);
      return;
    }

    // Determine direction: 1 = next month (right to left), -1 = prev month (left to right)
    const isNextMonth = currentMonth > previousMonthRef.current;
    const direction = isNextMonth ? 1 : -1;

    // Trigger the animation
    if (scopeRef.current) {
      scopeRef.current.methods.animateGridTransition(direction);
    }

    previousMonthRef.current = new Date(currentMonth);
  }, [currentMonth]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (loading) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          goToPreviousMonth();
          break;
        case "ArrowRight":
          event.preventDefault();
          goToNextMonth();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, goToPreviousMonth, goToNextMonth]);

  const calendarGrid = useMemo(() => {
    const days: CalendarDay[] = [];
    const year = currentMonth.getUTCFullYear();
    const month = currentMonth.getUTCMonth();

    // Get first day of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();

    // Get number of days in the current month
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    // Get number of days in the previous month
    const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    // Add padding days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNumber = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const date = new Date(Date.UTC(prevYear, prevMonth, dayNumber));
      const dateStr = toDateString(date);

      days.push({
        date: dateStr,
        dayNumber,
        isCurrentMonth: false,
        events: [],
      });
    }

    // Add days of the current month
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
      const date = new Date(Date.UTC(year, month, dayNumber));
      const dateStr = toDateString(date);

      // Get events from v2 data structure: calendarV2Data[year][month][day]
      // Data keys format: year (YYYY), month (MM padded), day (DD padded)
      const monthKey = String(month + 1).padStart(2, "0");
      const dayKey = String(dayNumber).padStart(2, "0");
      const dayEvents =
        (calendarV2Data?.[year.toString()]?.[monthKey]?.[dayKey] as
          | EventAttributes[]
          | undefined) || [];

      days.push({
        date: dateStr,
        dayNumber,
        isCurrentMonth: true,
        events: dayEvents,
      });
    }

    // Add padding days from next month
    const remainingSlots = 42 - days.length;
    for (let dayNumber = 1; dayNumber <= remainingSlots; dayNumber++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const date = new Date(Date.UTC(nextYear, nextMonth, dayNumber));
      const dateStr = toDateString(date);

      days.push({
        date: dateStr,
        dayNumber,
        isCurrentMonth: false,
        events: [],
      });
    }

    return days;
  }, [currentMonth, calendarV2Data]);

  return (
    <div
      ref={containerRef}
      className={clsx("flex h-screen w-screen flex-col", className)}
    >
      {/* Navbar */}
      <div className="flex items-center justify-between border-b border-gray-300 bg-white px-4 py-3">
        <button
          onClick={goToPreviousMonth}
          disabled={loading}
          className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>

        <h2 className="text-lg font-semibold text-gray-800">
          {currentMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <button
          onClick={goToNextMonth}
          disabled={loading}
          className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5 text-gray-700" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div ref={gridRef} className="grid flex-1 grid-cols-7 gap-0">
        {calendarGrid.map((day) => (
          <div
            key={day.date}
            className={clsx(
              "border border-gray-300 p-2 transition-colors hover:bg-gray-100",
              !day.isCurrentMonth && "bg-gray-50 text-gray-400",
            )}
          >
            <div className="text-sm font-semibold">{day.dayNumber}</div>
            <div className="mt-1 text-xs text-gray-600">
              {day.events.length > 0 && <div>{day.events.length} event(s)</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
