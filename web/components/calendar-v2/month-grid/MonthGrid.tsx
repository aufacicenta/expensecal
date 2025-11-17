import { filterEventsByCategories } from "@/lib/calendar/filterEvents";
import { isSameDay, toDateString } from "@/lib/date/formatters";
import { EventAttributes } from "@expensecal/database/models/Event";
import clsx from "clsx";
import { useMemo } from "react";
import { CalendarEventCell } from "../../calendar/calendar-event-cell/CalendarEventCell";
import { CalendarDay, MonthGridProps } from "./MonthGrid.types";

/**
 * Renders a single month's calendar grid (7 columns x 6 rows)
 * Grid is always screen height to maintain consistent spacing
 */
export const MonthGrid: React.FC<MonthGridProps> = ({
  year,
  month,
  calendarData,
  selectedCategoryIds = [],
  className,
}) => {
  const calendarGrid = useMemo(() => {
    const days: CalendarDay[] = [];
    const today = new Date();

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
        isCurrentDay: isSameDay(date, today),
        events: [],
      });
    }

    // Add days of the current month
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
      const date = new Date(Date.UTC(year, month, dayNumber));
      const dateStr = toDateString(date);

      // Get events from data structure: calendarData[day (DD padded)]
      const dayKey = String(dayNumber).padStart(2, "0");
      const dayEvents =
        (calendarData?.[dayKey] as EventAttributes[] | undefined) || [];

      days.push({
        date: dateStr,
        dayNumber,
        isCurrentMonth: true,
        isCurrentDay: isSameDay(date, today),
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
        isCurrentDay: isSameDay(date, today),
        events: [],
      });
    }

    return days;
  }, [year, month, calendarData]);

  return (
    <div
      className={clsx(
        "grid w-screen flex-shrink-0 grid-cols-7 gap-0",
        className,
      )}
      style={{
        height: "calc(100vh - 64px)", // 100vh minus navbar height
      }}
    >
      {calendarGrid.map((day) => {
        const filteredEvents = filterEventsByCategories(
          day.events,
          selectedCategoryIds,
        );

        return (
          <div
            key={day.date}
            className={clsx(
              "border-content1 border p-1 transition-colors",
              !day.isCurrentMonth && "bg-content2",
            )}
          >
            <div className="hover:bg-content2 h-full rounded p-2">
              <div
                className={clsx(
                  !day.isCurrentDay && "text-xs",
                  day.isCurrentDay && "text-focus text-lg font-bold",
                )}
              >
                {day.dayNumber}
              </div>
              <div className="mt-1 space-y-1 text-xs">
                {filteredEvents.length > 0 && (
                  <>
                    {filteredEvents.slice(0, 3).map((event) => (
                      <CalendarEventCell key={event.id} event={event} />
                    ))}
                    {filteredEvents.length > 3 && (
                      <div className="text-gray-500">
                        +{filteredEvents.length - 3} more
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
