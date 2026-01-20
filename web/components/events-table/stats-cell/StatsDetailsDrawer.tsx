import { Chip } from "@heroui/chip";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import clsx from "clsx";
import Decimal from "decimal.js";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";

import {
  CategoryBreakdown,
  StatsDetailsDrawerProps,
} from "./StatsDetailsDrawer.types";

import { CalendarEvent } from "@/app/api/v2/calendar/types";
import { formatCurrency } from "@/lib/currency/formatter";

const VARIANT_LABELS = {
  day: "Daily",
  month: "Monthly",
  year: "Yearly",
} as const;

export const StatsDetailsDrawer: React.FC<StatsDetailsDrawerProps> = ({
  isOpen,
  onClose,
  calendarV2Data,
  variant,
  period,
  type,
}) => {
  const isIncome = type === "income";
  const eventType = isIncome ? "INCOME" : "EXPENSE";

  // Aggregate events for the given period by category
  const categoryBreakdowns = useMemo(() => {
    const breakdownMap = new Map<string, CategoryBreakdown>();
    const uncategorizedEvents: CategoryBreakdown["events"] = [];
    let uncategorizedTotal = new Decimal(0);

    // Helper to process an event
    const processEvent = (event: CalendarEvent) => {
      if (event.type !== eventType) return;

      const amount = new Decimal(event.exchangeRate);
      const eventData = {
        id: event.id!,
        description: event.description,
        amount: event.exchangeRate,
        date: new Date(event.event_date),
      };

      const categories = event.categories || [];

      if (categories.length === 0) {
        // Handle uncategorized events
        uncategorizedTotal = uncategorizedTotal.plus(amount);
        uncategorizedEvents.push(eventData);
      } else {
        // Add to each category the event belongs to
        categories.forEach((category) => {
          const existing = breakdownMap.get(category.id!);

          if (existing) {
            existing.totalAmount = new Decimal(existing.totalAmount)
              .plus(amount)
              .toString();
            existing.eventCount += 1;
            existing.events.push(eventData);
          } else {
            breakdownMap.set(category.id!, {
              categoryId: category.id!,
              categoryName: category.name,
              categoryColor: category.color,
              totalAmount: amount.toString(),
              eventCount: 1,
              events: [eventData],
            });
          }
        });
      }
    };

    // Filter events based on variant and period
    const { year, month, day } = period;

    if (variant === "year") {
      // Get all events for the year
      const yearData = calendarV2Data.calendar[year];

      if (yearData) {
        Object.values(yearData).forEach((monthData) => {
          Object.values(monthData).forEach((dayEvents) => {
            (dayEvents as CalendarEvent[]).forEach(processEvent);
          });
        });
      }
    } else if (variant === "month" && month) {
      // Get all events for the month
      const monthData = calendarV2Data.calendar[year]?.[month];

      if (monthData) {
        Object.values(monthData).forEach((dayEvents) => {
          (dayEvents as CalendarEvent[]).forEach(processEvent);
        });
      }
    } else if (variant === "day" && month && day) {
      // Get all events for the day
      const dayEvents = calendarV2Data.calendar[year]?.[month]?.[day];

      if (dayEvents) {
        (dayEvents as CalendarEvent[]).forEach(processEvent);
      }
    }

    // Convert map to sorted array (highest to lowest)
    const result = Array.from(breakdownMap.values()).sort((a, b) =>
      new Decimal(b.totalAmount).minus(new Decimal(a.totalAmount)).toNumber(),
    );

    // Add uncategorized at the end if there are any
    if (uncategorizedEvents.length > 0) {
      result.push({
        categoryId: "uncategorized",
        categoryName: "Uncategorized",
        categoryColor: "#9CA3AF",
        totalAmount: uncategorizedTotal.toString(),
        eventCount: uncategorizedEvents.length,
        events: uncategorizedEvents.sort((a, b) =>
          new Decimal(b.amount).minus(new Decimal(a.amount)).toNumber(),
        ),
      });
    }

    // Sort events within each category by amount (highest first)
    result.forEach((category) => {
      category.events.sort((a, b) =>
        new Decimal(b.amount).minus(new Decimal(a.amount)).toNumber(),
      );
    });

    return result;
  }, [calendarV2Data, variant, period, eventType]);

  // Calculate total for the period
  const total = useMemo(() => {
    return categoryBreakdowns
      .reduce(
        (acc, cat) => acc.plus(new Decimal(cat.totalAmount)),
        new Decimal(0),
      )
      .toString();
  }, [categoryBreakdowns]);

  // Get the highest category/event
  const highestCategory = categoryBreakdowns[0];
  const highestEvent = highestCategory?.events[0];

  // Format period label
  const getPeriodLabel = () => {
    const { year, month, day } = period;

    if (variant === "year") {
      return year;
    } else if (variant === "month" && month) {
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      return `${monthNames[parseInt(month) - 1]} ${year}`;
    } else if (variant === "day" && month && day) {
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    return "";
  };

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      size="md"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader className="border-default-200 flex flex-col gap-1 border-b">
          <div className="flex items-center gap-2">
            {isIncome ? (
              <TrendingUp className="text-success" size={20} />
            ) : (
              <TrendingDown className="text-danger" size={20} />
            )}
            <h3 className="text-lg font-semibold">
              {VARIANT_LABELS[variant]} {isIncome ? "Income" : "Expenses"}
            </h3>
          </div>
          <p className="text-default-500 text-sm">{getPeriodLabel()}</p>
        </DrawerHeader>

        <DrawerBody className="py-4">
          <div className="flex flex-col gap-6">
            {/* Total Summary */}
            <div
              className={clsx(
                "rounded-lg p-4",
                isIncome ? "bg-success-50" : "bg-danger-50",
              )}
            >
              <div className="text-default-500 mb-1 text-sm">
                Total {isIncome ? "Income" : "Expenses"}
              </div>
              <div
                className={clsx(
                  "text-2xl font-bold",
                  isIncome ? "text-success" : "text-danger",
                )}
              >
                {formatCurrency(total)}
              </div>
              <div className="text-default-400 mt-1 text-xs">
                {categoryBreakdowns.reduce(
                  (acc, cat) => acc + cat.eventCount,
                  0,
                )}{" "}
                transactions across {categoryBreakdowns.length} categories
              </div>
            </div>

            {/* Highest Item Highlight */}
            {highestCategory && highestEvent && (
              <div className="border-default-200 rounded-lg border p-4">
                <div className="text-default-500 mb-2 text-sm font-medium">
                  Highest {isIncome ? "Income" : "Expense"}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: highestCategory.categoryColor,
                        }}
                      />
                      <span className="text-sm font-medium">
                        {highestCategory.categoryName}
                      </span>
                    </div>
                    <p className="text-default-400 mt-1 truncate text-xs">
                      {highestEvent.description}
                    </p>
                  </div>
                  <div
                    className={clsx(
                      "shrink-0 text-right font-mono text-sm font-bold",
                      isIncome ? "text-success" : "text-danger",
                    )}
                  >
                    {formatCurrency(highestEvent.amount)}
                  </div>
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            <div>
              <h4 className="text-default-600 mb-3 text-sm font-semibold">
                Breakdown by Category
              </h4>

              {categoryBreakdowns.length === 0 ? (
                <p className="text-default-400 text-sm">
                  No {isIncome ? "income" : "expenses"} for this period.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {categoryBreakdowns.map((category, index) => {
                    const percentage = new Decimal(category.totalAmount)
                      .div(new Decimal(total))
                      .times(100)
                      .toFixed(1);

                    return (
                      <div
                        key={category.categoryId}
                        className="border-default-200 rounded-lg border"
                      >
                        {/* Category Header */}
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <div className="text-default-400 w-5 text-xs font-medium">
                              #{index + 1}
                            </div>
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: category.categoryColor,
                              }}
                            />
                            <span className="text-sm font-medium">
                              {category.categoryName}
                            </span>
                            <Chip size="sm" variant="flat">
                              {category.eventCount}
                            </Chip>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-default-400 text-xs">
                              {percentage}%
                            </span>
                            <span
                              className={clsx(
                                "font-mono text-sm font-bold",
                                isIncome ? "text-success" : "text-danger",
                              )}
                            >
                              {formatCurrency(category.totalAmount)}
                            </span>
                          </div>
                        </div>

                        {/* Events List */}
                        <div className="border-default-100 border-t">
                          {category.events
                            .slice(0, 5)
                            .map((event, eventIndex) => (
                              <div
                                key={event.id}
                                className={clsx(
                                  "flex items-center justify-between px-3 py-2",
                                  eventIndex !==
                                    Math.min(4, category.events.length - 1) &&
                                    "border-default-50 border-b",
                                )}
                              >
                                <div className="flex-1 pr-2">
                                  <p className="text-default-600 truncate text-xs">
                                    {event.description}
                                  </p>
                                  <p className="text-default-400 text-[10px]">
                                    {event.date.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                </div>
                                <span className="text-default-500 shrink-0 font-mono text-xs">
                                  {formatCurrency(event.amount)}
                                </span>
                              </div>
                            ))}
                          {category.events.length > 5 && (
                            <div className="text-default-400 px-3 py-2 text-center text-xs">
                              +{category.events.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};
