import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { NavbarTopProps } from "./NavbarTop.types";

import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { EventCategories } from "@/components/calendar/event-categories/EventCategories";

export const NavbarTop: React.FC<NavbarTopProps> = ({
  className,
  currentMonthIndex,
  availableMonths,
}) => {
  const { actionStates, goToPreviousMonth, goToNextMonth } =
    useCalendarV2Context();

  return (
    <div
      className={clsx("flex items-center justify-between px-4 py-3", className)}
    >
      <div>
        <div className="flex flex-col">
          <span>ExpenseCal</span>
        </div>
      </div>
      <div className="flex items-center">
        <button
          aria-label="Previous month"
          className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={
            actionStates.loadCalendarV2.isLoading || currentMonthIndex <= 0
          }
          onClick={goToPreviousMonth}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h2 className="mb-0 text-lg font-semibold">
          {currentMonthIndex !== -1 && availableMonths[currentMonthIndex]
            ? availableMonths[currentMonthIndex].label
            : "Loading..."}
        </h2>
        <button
          aria-label="Next month"
          className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={
            actionStates.loadCalendarV2.isLoading ||
            currentMonthIndex >= availableMonths.length - 1
          }
          onClick={goToNextMonth}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div>
        <EventCategories />
      </div>
    </div>
  );
};
