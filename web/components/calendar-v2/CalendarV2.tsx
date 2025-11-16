"use client";

import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import {
  extractAvailableMonths,
  findMonthIndex,
} from "@/lib/calendar/monthExtractor";
import { animate, createScope, Scope } from "animejs";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { CalendarV2Props } from "./CalendarV2.types";
import { MonthGrid } from "./month-grid/MonthGrid";

export const CalendarV2: React.FC<CalendarV2Props> = ({ className }) => {
  const {
    calendarV2Data,
    currentMonth,
    loading,
    goToPreviousMonth,
    goToNextMonth,
    goToMonth,
    loadCalendarV2,
  } = useCalendarV2Context();

  const containerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<Scope | null>(null);

  // Extract all available months and find current month index
  const availableMonths = useMemo(
    () => extractAvailableMonths(calendarV2Data),
    [calendarV2Data],
  );

  const currentMonthIndex = useMemo(
    () => findMonthIndex(currentMonth, availableMonths),
    [currentMonth, availableMonths],
  );

  useEffect(() => {
    // Load calendar data on mount
    loadCalendarV2();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !carouselRef.current) return;

    // Initialize anime scope for carousel animations
    scopeRef.current = createScope({ root: containerRef.current }).add(
      (self) => {
        self?.add("animateCarousel", (monthIndex: number) => {
          if (!carouselRef.current) return;

          // Calculate translateX in vw units: each month is 100vw wide
          const targetTranslateX = -monthIndex * 100;

          animate(carouselRef.current, {
            translateX: `${targetTranslateX}vw`,
            duration: 400,
            easing: "easeInOutCubic",
          });
        });
      },
    );

    return () => {
      scopeRef.current?.revert();
    };
  }, []);

  // Animate carousel when month changes
  useEffect(() => {
    if (currentMonthIndex === -1 || !scopeRef.current) return;

    // Trigger animation with the current month index
    scopeRef.current.methods.animateCarousel(currentMonthIndex);
  }, [currentMonthIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (loading || currentMonthIndex === -1) return;

      switch (event.key.toLowerCase()) {
        case "arrowleft":
          event.preventDefault();
          if (currentMonthIndex > 0) {
            goToPreviousMonth();
          }
          break;
        case "arrowright":
          event.preventDefault();
          if (currentMonthIndex < availableMonths.length - 1) {
            goToNextMonth();
          }
          break;
        case "t":
          event.preventDefault();
          goToMonth(new Date());
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    loading,
    currentMonthIndex,
    availableMonths.length,
    goToPreviousMonth,
    goToNextMonth,
    goToMonth,
  ]);

  return (
    <div
      ref={containerRef}
      className={clsx("flex h-screen w-screen flex-col", className)}
    >
      {/* Navbar */}
      <div className="flex items-center justify-between border-b border-gray-300 bg-white px-4 py-3">
        <button
          onClick={goToPreviousMonth}
          disabled={loading || currentMonthIndex <= 0}
          className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>

        <h2 className="text-lg font-semibold text-gray-800">
          {currentMonthIndex !== -1 && availableMonths[currentMonthIndex]
            ? availableMonths[currentMonthIndex].label
            : "Loading..."}
        </h2>

        <button
          onClick={goToNextMonth}
          disabled={loading || currentMonthIndex >= availableMonths.length - 1}
          className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5 text-gray-700" />
        </button>
      </div>

      {/* Carousel Container - overflow-x hidden to clip grids */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={carouselRef}
          className="flex"
          style={{
            width: `${availableMonths.length * 100}vw`,
          }}
        >
          {/* Render all available months as grids */}
          {availableMonths.map((month) => {
            const yearMonthData = calendarV2Data?.[month.year]?.[month.month];
            return (
              <MonthGrid
                key={`${month.year}-${month.month}`}
                year={parseInt(month.year, 10)}
                month={parseInt(month.month, 10) - 1} // MonthGrid expects 0-indexed month
                calendarData={yearMonthData}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
