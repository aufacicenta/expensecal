"use client";

import { CalendarContext } from "@/context/Calendar/CalendarContext";
import { useDayModalContext } from "@/context/DayModal/useDayModalContext";
import { calculateModalPosition } from "@/lib/calendar/modalPosition";
import { Divider } from "@heroui/divider";
import clsx from "clsx";
import { useContext, useEffect } from "react";
import { CalendarProps } from "./Calendar.types";
import { CalendarEventCell } from "./calendar-event-cell/CalendarEventCell";

export const Calendar: React.FC<CalendarProps> = ({ children, className }) => {
  const calendarContext = useContext(CalendarContext);
  const dayModalContext = useDayModalContext();
  const currentMonth = new Date().toISOString().split("T")[0].slice(0, 7);

  useEffect(() => {
    if (calendarContext) {
      calendarContext.loadCalendar(currentMonth);
    }
  }, []);

  const { calendarData, loading, error, cellLoadingStates } =
    calendarContext || {
      calendarData: null,
      loading: true,
      error: null,
      cellLoadingStates: new Map(),
    };

  // Show loading state only on first load
  if (loading && !calendarData) {
    return (
      <div className={clsx("w-full p-4", className)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Loading calendar...</h2>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array(49)
            .fill(null)
            .map((_, i) => (
              <div
                key={i}
                className="hover:bg-content2 bg-content1 relative aspect-video animate-pulse cursor-pointer rounded p-1"
              />
            ))}
        </div>
      </div>
    );
  }

  if (error && !calendarData) {
    return (
      <div className={className}>
        <div className="text-danger">Error: {error}</div>
      </div>
    );
  }

  if (!calendarData) {
    return <div className={className}>No calendar data</div>;
  }

  const month = calendarData.months[0];

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
          {month.days.map((day, index) => {
            const isCellLoading = cellLoadingStates?.get(day.date) || false;

            return (
              <div
                key={index}
                onClick={(e) => {
                  if (!isCellLoading) {
                    const rect = (
                      e.currentTarget as HTMLElement
                    ).getBoundingClientRect();

                    const position = calculateModalPosition(rect);
                    dayModalContext.openModal(day, position);
                  }
                }}
                className={clsx(
                  "hover:bg-content2 relative aspect-video cursor-pointer rounded p-1 text-xs transition-all",
                  day.isCurrentMonth
                    ? "text-gray-300"
                    : "bg-content1 rounded text-gray-300",
                  day.isToday && "",
                  day.financialSummary.eventCount > 0 && day.isCurrentMonth
                    ? ""
                    : "",
                  isCellLoading && "opacity-60",
                )}
              >
                {/* Loading overlay */}
                {isCellLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded bg-white/5 backdrop-blur-sm">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </div>
                )}

                {day.dayOfMonth > 0 && (
                  <>
                    <div className="space-y-0.5">
                      <div
                        className={clsx(
                          !day.isToday && "text-content3 font-medium",
                          day.isToday && "text-focus text-sm font-bold",
                        )}
                      >
                        {day.dayOfMonth}
                      </div>
                      {day.events.map((event) => (
                        <CalendarEventCell key={event.id} event={event} />
                      ))}
                    </div>

                    {!!day.events.length && day.events.length > 0 && (
                      <div className="text-xxs absolute right-0 bottom-0 left-0 flex w-full justify-between">
                        <div className="p-1">
                          <span className="text-success">
                            +{day.financialSummary.baseCurrencySymbol}{" "}
                            {Number(day.financialSummary.totalIncome).toFixed(
                              2,
                            )}
                          </span>
                        </div>
                        <div className="p-1">
                          <span className="text-danger">
                            -{day.financialSummary.baseCurrencySymbol}{" "}
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
                            {day.financialSummary.baseCurrencySymbol}{" "}
                            {Number(day.financialSummary.net).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Calendar Bottom Stats Bar */}
        <div className="text-xxs mt-4 flex items-center gap-8">
          <div className="flex [&>div]:p-2">
            <div>
              <div className="text-gray-500">Total Income</div>
              <div className="text-success font-medium">
                +{calendarData.monthlyFinancialSummary.baseCurrency.symbol}{" "}
                {Number(
                  calendarData.monthlyFinancialSummary.baseCurrency.totalIncome,
                ).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Total Expenses</div>
              <div className="text-danger font-medium">
                -{calendarData.monthlyFinancialSummary.baseCurrency.symbol}{" "}
                {Number(
                  calendarData.monthlyFinancialSummary.baseCurrency
                    .totalExpenses,
                ).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Net</div>
              <div
                className={clsx(
                  "font-medium",
                  Number(
                    calendarData.monthlyFinancialSummary.baseCurrency.net,
                  ) > 0
                    ? "text-success"
                    : "text-danger",
                )}
              >
                {calendarData.monthlyFinancialSummary.baseCurrency.symbol}{" "}
                {Number(
                  calendarData.monthlyFinancialSummary.baseCurrency.net,
                ).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="h-5">
            <Divider orientation="vertical" />
          </div>
          {Object.entries(calendarData.monthlyFinancialSummary.byCurrency).map(
            ([currencyId, currency]) => (
              <>
                <div key={currencyId} className="flex [&>div]:p-2">
                  <div>
                    <div className="text-gray-500">
                      {currency.symbol} Income
                    </div>
                    <div className="text-success font-medium">
                      +{Number(currency.totalIncome).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">
                      {currency.symbol} Expenses
                    </div>
                    <div className="text-danger font-medium">
                      -{Number(currency.totalExpenses).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">{currency.symbol} Net</div>
                    <div
                      className={clsx(
                        "font-medium",
                        Number(currency.net) > 0
                          ? "text-success"
                          : "text-danger",
                      )}
                    >
                      {Number(currency.net).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="h-5">
                  <Divider orientation="vertical" />
                </div>
              </>
            ),
          )}
        </div>
      </div>
    </div>
  );
};
