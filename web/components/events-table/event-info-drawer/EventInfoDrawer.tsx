import { Chip } from "@heroui/chip";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import Decimal from "decimal.js";

import { EventInfoDrawerProps } from "./EventInfoDrawer.types";

import { CalendarEvent, MonthStats } from "@/app/api/v2/calendar/types";
import { formatCurrency } from "@/lib/currency/formatter";
import { toDateString } from "@/lib/date/formatters";

export const EventInfoDrawer: React.FC<EventInfoDrawerProps> = ({
  event,
  calendarV2Data,
  isOpen,
  onClose,
}) => {
  if (!event) {
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
          <DrawerHeader>
            <h3 className="text-lg font-semibold">Event Details</h3>
          </DrawerHeader>
          <DrawerBody>
            <p className="text-default-500">No event selected</p>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  const eventDate = new Date(event.event_date);
  const year = eventDate.getFullYear().toString();
  const month = (eventDate.getMonth() + 1).toString();
  const day = eventDate.getDate().toString();

  const yearStats = calendarV2Data.stats[year];
  const monthStats = yearStats?.[month] as MonthStats | undefined;
  const dayStats = monthStats?.[day] as
    | { totalIncome: string; totalExpenses: string; net: string }
    | undefined;

  // exchangeRate field already contains the converted total (amount × quantity × rate in USD)
  const singleEventAmount = new Decimal(event.exchangeRate);

  // Check if this is a recurring event (has childEvents)
  const isRecurring =
    event.childEvents !== undefined && event.childEvents.length > 0;
  const childEvents = event.childEvents || [];
  const instanceCount = isRecurring ? 1 + childEvents.length : 1;

  // For recurring events, aggregate all instances (parent + children)
  // childEvents don't have exchangeRate yet, so we use parent's rate for each instance
  const eventAmount = isRecurring
    ? singleEventAmount.times(instanceCount)
    : singleEventAmount;

  const isExpense = event.type === "EXPENSE";
  const isIncome = event.type === "INCOME";

  // Calculate category percentages
  const eventCategories = event.categories || [];
  const categoryStats: {
    name: string;
    color: string;
    percentage: string;
  }[] = [];

  if (eventCategories.length > 0) {
    // Sum up all events with matching categories across the entire calendar
    eventCategories.forEach((category) => {
      let categoryTotal = new Decimal(0);

      Object.values(calendarV2Data.calendar).forEach((yearObj) => {
        Object.values(
          yearObj as Record<string, Record<string, CalendarEvent[]>>,
        ).forEach((monthObj) => {
          Object.values(monthObj as Record<string, CalendarEvent[]>).forEach(
            (events) => {
              (events as CalendarEvent[]).forEach((calEvent) => {
                const matchesCategory = calEvent.categories?.some(
                  (cat) => cat.id === category.id,
                );

                if (matchesCategory && calEvent.type === event.type) {
                  // exchangeRate already contains the converted total in USD
                  const evtAmount = new Decimal(calEvent.exchangeRate);

                  categoryTotal = categoryTotal.plus(evtAmount);

                  // Note: childEvents are stored as individual calendar entries,
                  // so they're counted when the loop iterates over them - no need
                  // to add them here (that would be double-counting)
                }
              });
            },
          );
        });
      });

      if (!categoryTotal.isZero()) {
        const percentage = eventAmount.div(categoryTotal).times(100).toFixed(2);

        categoryStats.push({
          name: category.name,
          color: category.color,
          percentage,
        });
      }
    });
  }

  // For recurring events, we need to aggregate stats across all instances' dates
  let totalDailyIncome = new Decimal(0);
  let totalDailyExpenses = new Decimal(0);
  let totalMonthlyIncome = new Decimal(0);
  let totalMonthlyExpenses = new Decimal(0);
  let totalYearlyIncome = new Decimal(0);
  let totalYearlyExpenses = new Decimal(0);

  // Helper to accumulate stats for a given date
  const accumulateStatsForDate = (date: Date) => {
    const y = date.getFullYear().toString();
    const m = (date.getMonth() + 1).toString();
    const d = date.getDate().toString();

    const ys = calendarV2Data.stats[y];
    const ms = ys?.[m] as MonthStats | undefined;
    const ds = ms?.[d] as
      | { totalIncome?: string; totalExpenses?: string }
      | undefined;

    if (ds?.totalIncome) {
      totalDailyIncome = totalDailyIncome.plus(new Decimal(ds.totalIncome));
    }

    if (ds?.totalExpenses) {
      totalDailyExpenses = totalDailyExpenses.plus(
        new Decimal(ds.totalExpenses),
      );
    }

    if (ms?.stats?.totalIncome) {
      totalMonthlyIncome = totalMonthlyIncome.plus(
        new Decimal(ms.stats.totalIncome),
      );
    }

    if (ms?.stats?.totalExpenses) {
      totalMonthlyExpenses = totalMonthlyExpenses.plus(
        new Decimal(ms.stats.totalExpenses),
      );
    }

    if (ys?.stats?.totalIncome) {
      totalYearlyIncome = totalYearlyIncome.plus(
        new Decimal(ys.stats.totalIncome),
      );
    }

    if (ys?.stats?.totalExpenses) {
      totalYearlyExpenses = totalYearlyExpenses.plus(
        new Decimal(ys.stats.totalExpenses),
      );
    }
  };

  if (isRecurring) {
    // Accumulate stats for parent event date
    accumulateStatsForDate(eventDate);
    // Accumulate stats for each child event date
    childEvents.forEach((child) => {
      accumulateStatsForDate(new Date(child.event_date));
    });
  } else {
    // Non-recurring: use single event's stats
    totalDailyIncome = dayStats?.totalIncome
      ? new Decimal(dayStats.totalIncome)
      : new Decimal(0);
    totalDailyExpenses = dayStats?.totalExpenses
      ? new Decimal(dayStats.totalExpenses)
      : new Decimal(0);
    totalMonthlyIncome = monthStats?.stats?.totalIncome
      ? new Decimal(monthStats.stats.totalIncome)
      : new Decimal(0);
    totalMonthlyExpenses = monthStats?.stats?.totalExpenses
      ? new Decimal(monthStats.stats.totalExpenses)
      : new Decimal(0);
    totalYearlyIncome = yearStats?.stats?.totalIncome
      ? new Decimal(yearStats.stats.totalIncome)
      : new Decimal(0);
    totalYearlyExpenses = yearStats?.stats?.totalExpenses
      ? new Decimal(yearStats.stats.totalExpenses)
      : new Decimal(0);
  }

  // Alias for backward compatibility
  const dailyIncome = totalDailyIncome;
  const dailyExpenses = totalDailyExpenses;
  const monthlyIncome = totalMonthlyIncome;
  const monthlyExpenses = totalMonthlyExpenses;
  const yearlyIncome = totalYearlyIncome;
  const yearlyExpenses = totalYearlyExpenses;

  const computePercent = (amount: Decimal, total: Decimal) => {
    if (total.isZero()) return "N/A";

    return amount.div(total).times(100).toFixed(2) + "%";
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
          <h3 className="text-lg font-semibold">Event Details</h3>
          <p className="text-default-500 text-sm">{event.description}</p>
        </DrawerHeader>
        <DrawerBody className="py-4">
          <div className="flex flex-col gap-6">
            {/* Event Amount Summary */}
            <div className="bg-default-100 rounded-lg p-4">
              <div className="text-default-500 mb-1 text-sm">
                Total Amount (USD)
                {isRecurring && ` — ${instanceCount} instances`}
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(eventAmount.toString())}
              </div>
              <div className="text-default-400 mt-1 text-xs">
                {isRecurring ? (
                  <>
                    {instanceCount} ×{" "}
                    {formatCurrency(singleEventAmount.toString())} USD
                  </>
                ) : (
                  <>
                    {event.quantity} × {formatCurrency(event.amount)}{" "}
                    {event.currency?.symbol}
                  </>
                )}
              </div>
            </div>

            {/* Category Breakdown */}
            {categoryStats.length > 0 && (
              <div>
                <h4 className="text-default-600 mb-3 text-sm font-semibold">
                  Category Contribution
                </h4>
                <div className="flex flex-col gap-2">
                  {categoryStats.map((cat) => (
                    <div
                      key={cat.name}
                      className="border-default-200 flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm">{cat.name}</span>
                      </div>
                      <span className="font-mono text-sm font-medium">
                        {cat.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expense Stats */}
            {isExpense && (
              <>
                <div>
                  <h4 className="text-default-600 mb-3 text-sm font-semibold">
                    % of Income
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border-default-200 rounded-lg border p-3 text-center">
                      <div className="text-default-400 mb-1 text-xs">Daily</div>
                      <div className="text-danger font-mono text-sm font-medium">
                        {computePercent(eventAmount, dailyIncome)}
                      </div>
                    </div>
                    <div className="border-default-200 rounded-lg border p-3 text-center">
                      <div className="text-default-400 mb-1 text-xs">
                        Monthly
                      </div>
                      <div className="text-danger font-mono text-sm font-medium">
                        {computePercent(eventAmount, monthlyIncome)}
                      </div>
                    </div>
                    <div className="border-default-200 rounded-lg border p-3 text-center">
                      <div className="text-default-400 mb-1 text-xs">
                        Yearly
                      </div>
                      <div className="text-danger font-mono text-sm font-medium">
                        {computePercent(eventAmount, yearlyIncome)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-default-600 mb-3 text-sm font-semibold">
                    % of Expenses
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border-default-200 rounded-lg border p-3 text-center">
                      <div className="text-default-400 mb-1 text-xs">Daily</div>
                      <div className="font-mono text-sm font-medium">
                        {computePercent(eventAmount, dailyExpenses)}
                      </div>
                    </div>
                    <div className="border-default-200 rounded-lg border p-3 text-center">
                      <div className="text-default-400 mb-1 text-xs">
                        Monthly
                      </div>
                      <div className="font-mono text-sm font-medium">
                        {computePercent(eventAmount, monthlyExpenses)}
                      </div>
                    </div>
                    <div className="border-default-200 rounded-lg border p-3 text-center">
                      <div className="text-default-400 mb-1 text-xs">
                        Yearly
                      </div>
                      <div className="font-mono text-sm font-medium">
                        {computePercent(eventAmount, yearlyExpenses)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Income Stats */}
            {isIncome && (
              <div>
                <h4 className="text-default-600 mb-3 text-sm font-semibold">
                  % of Total Income
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="border-default-200 rounded-lg border p-3 text-center">
                    <div className="text-default-400 mb-1 text-xs">Daily</div>
                    <div className="text-success font-mono text-sm font-medium">
                      {computePercent(eventAmount, dailyIncome)}
                    </div>
                  </div>
                  <div className="border-default-200 rounded-lg border p-3 text-center">
                    <div className="text-default-400 mb-1 text-xs">Monthly</div>
                    <div className="text-success font-mono text-sm font-medium">
                      {computePercent(eventAmount, monthlyIncome)}
                    </div>
                  </div>
                  <div className="border-default-200 rounded-lg border p-3 text-center">
                    <div className="text-default-400 mb-1 text-xs">Yearly</div>
                    <div className="text-success font-mono text-sm font-medium">
                      {computePercent(eventAmount, yearlyIncome)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Event Metadata */}
            <div className="border-default-200 border-t pt-4">
              <h4 className="text-default-600 mb-3 text-sm font-semibold">
                Event Info
              </h4>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-default-400">Date</span>
                  <span>{toDateString(eventDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-400">Type</span>
                  <Chip
                    color={isExpense ? "danger" : "success"}
                    size="sm"
                    variant="flat"
                  >
                    {event.type}
                  </Chip>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-400">Currency</span>
                  <span>{event.currency?.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-400">Exchange Rate</span>
                  <span className="font-mono">
                    {new Decimal(event.exchangeRate).toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};
