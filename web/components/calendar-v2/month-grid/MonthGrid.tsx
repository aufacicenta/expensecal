import { toDateString } from "@/lib/date/formatters";
import { EventAttributes } from "@expensecal/database/models/Event";
import clsx from "clsx";
import { useMemo } from "react";
import { CalendarDay, MonthGridProps } from "./MonthGrid.types";

/**
 * Renders a single month's calendar grid (7 columns x 6 rows)
 * Grid is always screen height to maintain consistent spacing
 */
export const MonthGrid: React.FC<MonthGridProps> = ({
  year,
  month,
  calendarData,
  className,
}) => {
  const calendarGrid = useMemo(() => {
    const days: CalendarDay[] = [];

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

      // Get events from data structure: calendarData[day (DD padded)]
      const dayKey = String(dayNumber).padStart(2, "0");
      const dayEvents =
        (calendarData?.[dayKey] as EventAttributes[] | undefined) || [];

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
  }, [year, month, calendarData]);

  return (
    <div
      className={clsx(
        "grid w-screen flex-shrink-0 grid-cols-7 gap-0",
        className,
      )}
      style={{
        height: "calc(100vh - 61px)", // 100vh minus navbar height
      }}
    >
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
  );
};
