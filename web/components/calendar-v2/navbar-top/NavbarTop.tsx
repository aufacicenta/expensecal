import { Button } from "@heroui/button";
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
        <Button
          isIconOnly
          aria-label="Previous month"
          isDisabled={
            actionStates.loadCalendarV2.isLoading || currentMonthIndex <= 0
          }
          size="sm"
          variant="light"
          onPress={goToPreviousMonth}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <h2 className="mb-0 text-lg font-semibold">
          {currentMonthIndex !== -1 && availableMonths[currentMonthIndex]
            ? availableMonths[currentMonthIndex].label
            : "Loading..."}
        </h2>
        <Button
          isIconOnly
          aria-label="Next month"
          isDisabled={
            actionStates.loadCalendarV2.isLoading ||
            currentMonthIndex >= availableMonths.length - 1
          }
          size="sm"
          variant="light"
          onPress={goToNextMonth}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      <div>
        <EventCategories />
      </div>
    </div>
  );
};
