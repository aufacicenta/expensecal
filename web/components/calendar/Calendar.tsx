"use client";

import { useContext, useEffect, useState } from "react";
import clsx from "clsx";
import { CalendarContext } from "@/context/Calendar/CalendarContext";
import {
  GetCalendarSuccessResponse,
  CalendarMonth,
} from "@/app/api/v1/calendar/types";
import { CalendarProps } from "./Calendar.types";
import { CalendarEventCell } from "./calendar-event-cell/CalendarEventCell";

export const Calendar: React.FC<CalendarProps> = ({ children, className }) => {
  const calendarContext = useContext(CalendarContext);
  const [calendarData, setCalendarData] = useState<CalendarMonth[] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentMonth = new Date().toISOString().split("T")[0].slice(0, 7);

  useEffect(() => {
    const loadCalendar = async () => {
      if (!calendarContext) {
        setError("Calendar context not available");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await calendarContext.fetchCalendar(currentMonth, 0);
        if (response.success) {
          const successResponse = response as GetCalendarSuccessResponse;
          setCalendarData(successResponse.data.months);
        } else {
          setError(response.error || "Failed to load calendar");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    // loadCalendar();
  }, [calendarContext, currentMonth]);

  if (loading) {
    return <div className={className}>Loading calendar...</div>;
  }

  if (error) {
    return <div className={className}>Error: {error}</div>;
  }

  if (!calendarData || calendarData.length === 0) {
    return <div className={className}>No calendar data</div>;
  }

  const month = calendarData[0];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className={clsx("w-full p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">
          {month.month}/{month.year}
        </h2>
      </div>

      <div>
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className={clsx(
                "py-2 text-center text-xs font-medium text-gray-500",
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {month.days.map((day, index) => (
            <div
              key={index}
              className={clsx(
                "relative aspect-video p-1 text-xs",
                day.isCurrentMonth
                  ? "text-gray-300"
                  : "bg-content1 rounded text-gray-300",
                day.isToday && "",
                day.financialSummary.eventCount > 0 && day.isCurrentMonth
                  ? ""
                  : "",
              )}
            >
              {day.dayOfMonth > 0 && (
                <>
                  <div className="space-y-0.5">
                    <div
                      className={clsx(
                        !day.isToday && "font-medium",
                        day.isToday && "text-focus text-sm font-bold",
                      )}
                    >
                      {day.dayOfMonth}
                    </div>
                    {day.events.map((event) => (
                      <CalendarEventCell event={event} />
                    ))}
                  </div>

                  {!!day.events.length && day.events.length > 0 && (
                    <div className="text-xxs border-b-content3 absolute right-0 bottom-0 left-0 flex w-full justify-between border-b">
                      <div className="p-1">
                        <span className="text-success">
                          +{Number(day.financialSummary.totalIncome).toFixed(2)}
                        </span>
                      </div>
                      <div className="p-1">
                        <span className="text-danger">
                          -
                          {Number(day.financialSummary.totalExpenses).toFixed(
                            2,
                          )}
                        </span>
                      </div>
                      <div className="p-1">
                        <span
                          className={clsx(
                            Number(day.financialSummary.net) > 0
                              ? "text-success"
                              : "text-danger",
                          )}
                        >
                          {Number(day.financialSummary.net).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
