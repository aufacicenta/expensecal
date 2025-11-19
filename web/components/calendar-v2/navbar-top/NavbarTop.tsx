import { EventCategories } from "@/components/calendar/event-categories/EventCategories";
import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavbarTopProps } from "./NavbarTop.types";

export const NavbarTop: React.FC<NavbarTopProps> = ({
  children,
  className,
  currentMonthIndex,
  availableMonths,
}) => {
  const { actionStates, goToPreviousMonth, goToNextMonth } = useCalendarV2Context();

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
          onClick={goToPreviousMonth}
          disabled={actionStates.loadCalendarV2.isLoading || currentMonthIndex <= 0}
          className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h2 className="mb-0 text-lg font-semibold">
          {currentMonthIndex !== -1 && availableMonths[currentMonthIndex]
            ? availableMonths[currentMonthIndex].label
            : "Loading..."}
        </h2>
        <button
          onClick={goToNextMonth}
          disabled={actionStates.loadCalendarV2.isLoading || currentMonthIndex >= availableMonths.length - 1}
          className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Next month"
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
