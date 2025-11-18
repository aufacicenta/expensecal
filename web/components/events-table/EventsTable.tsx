import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { useEventCategoriesContext } from "@/context/EventCategories/useEventCategoriesContext";
import { useEventsContext } from "@/context/Events/useEventsContext";
import { EventsTableProps } from "./EventsTable.types";

import {
  CalendarEvent,
  DayStats,
  MonthStats,
} from "@/app/api/v2/calendar/types";
import { formatCurrency } from "@/lib/currency/formatter";
import { formatDayShort, formatMonthShort } from "@/lib/date/formatters";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import clsx from "clsx";
import Decimal from "decimal.js";
import {
  ArrowLeftRight,
  Circle,
  Diff,
  ListFilter,
  Trash,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EventCellCategoriesSelect } from "./event-cell-categories-select/EventCellCategoriesSelect";
import { EventCellQuantityEdit } from "./event-cell-quantity-edit/EventCellQuantityEdit";

export const EventsTable: React.FC<EventsTableProps> = ({}) => {
  const { calendarV2Data, loadCalendarV2, updateCalendarCellEvent } =
    useCalendarV2Context();
  const { updateEvent } = useEventsContext();
  const { categories } = useEventCategoriesContext();
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [selectedEventForCategories, setSelectedEventForCategories] =
    useState<CalendarEvent | null>(null);
  const [selectedEventForQuantity, setSelectedEventForQuantity] =
    useState<CalendarEvent | null>(null);

  const handleEventCategoryUpdate = async (
    eventId: string,
    categoryIds: string[],
    eventDate: Date,
    currentEvent: CalendarEvent,
  ) => {
    // Update the event with new category ids
    await updateEvent(
      eventId,
      {
        categoryIds,
      },
      eventDate,
    );
  };

  const handleEventQuantityUpdate = async (
    eventId: string,
    quantity: number,
    eventDate: Date,
  ) => {
    // Update the event with new quantity
    await updateEvent(
      eventId,
      {
        quantity,
      },
      eventDate,
    );
  };

  useEffect(() => {
    if (!!calendarV2Data) return;

    // Load calendar data on mount
    loadCalendarV2();
  }, []);

  if (!calendarV2Data) return "Loading...";

  return (
    <section className="relative w-fit overflow-x-auto pt-[33px]">
      {/* Fixed Table Nav */}
      <nav className="[&>div]:border-content3 text-content4 bg-background fixed top-0 left-0 flex w-fit items-center text-xs font-semibold [&>div]:flex [&>div]:items-center [&>div]:gap-1 [&>div]:border-[0.5px] [&>div]:p-1">
        <div className="hover:text-content4-foreground w-[180px] cursor-pointer justify-center">
          <span>Year</span>
          <ListFilter size={12} />
        </div>
        <div className="hover:text-content4-foreground w-[120px] cursor-pointer justify-center">
          <span>Month</span>
          <ListFilter size={12} />
        </div>
        <div className="w-[120px] justify-center">
          <span>Day</span>
        </div>
        <div className="w-[120px] justify-end">
          <span>Qty</span>
        </div>
        <div className="w-[120px] justify-end">
          <span>Amount</span>
        </div>
        <div className="w-[120px] justify-end">
          <span>Total Amount</span>
        </div>
        <div className="hover:text-content4-foreground w-[90px] cursor-pointer">
          <span>Currency</span>
          <ListFilter size={12} />
        </div>
        <div className="w-[120px] justify-end">
          <span>Ex. Rate (USD)</span>
        </div>
        <div
          className="hover:text-content4-foreground w-[210px] cursor-pointer"
          onClick={() => setShowOriginalText(!showOriginalText)}
        >
          <span>{showOriginalText ? "Original Text" : "Description"}</span>
          <ArrowLeftRight size={12} />
        </div>
        <div className="hover:text-content4-foreground w-[180px] cursor-pointer">
          <span>Categories</span>
          <ListFilter size={12} />
        </div>
        <div className="w-[70px] justify-end">
          <span>Actions</span>
        </div>
      </nav>
      {Object.entries(calendarV2Data.calendar || {}).map(([year, yearObj]) => (
        <div className="border-content4 border-b" key={year}>
          <div className="flex">
            <div className="border-content2 flex w-[180px] flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0">
              {year}
            </div>
            <div className="flex flex-col">
              {Object.entries(yearObj)
                .sort(([monthA], [monthB]) => Number(monthA) - Number(monthB))
                .map(([month, monthObj]) => (
                  <div
                    className="border-content4 border-b-[0.5px] [&:not(:last-child)]:border-b"
                    key={`${year}-${month}`}
                  >
                    <div className="flex">
                      <div className="border-content2 flex w-[120px] flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0">
                        {formatMonthShort(`${year}-${month}`)}
                      </div>
                      <div className="flex flex-col">
                        {Object.entries(monthObj)
                          .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
                          .map(([day, events]) => (
                            <div
                              className="group border-b-content2 last-of-type:border-b"
                              key={`${year}-${month}-${day}`}
                            >
                              <div className="flex">
                                <div className="border-content2 group-hover:bg-content2 flex w-[120px] flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0 p-1">
                                  <span className="text-xs">
                                    {formatDayShort(`${year}-${month}-${day}`)}
                                  </span>
                                  <span>{day}</span>
                                </div>
                                <div className="">
                                  {events.map((eventObj) => (
                                    <div
                                      className={clsx(
                                        "hover:bg-content2 last-of-type:border-b-content2 flex flex-1 text-xs last-of-type:border-b-[0.5px] [&>div]:flex [&>div]:flex-col [&>div]:justify-center [&>div]:border-[0.5px] [&>div]:border-b-0 [&>div]:p-1",
                                        events.length === 1 && "h-full",
                                      )}
                                      key={eventObj.id}
                                    >
                                      <div
                                        className="border-content2 group hover:bg-content1 relative w-[120px] cursor-pointer text-right transition-colors"
                                        data-cell-name="event-quantity"
                                        onClick={() =>
                                          setSelectedEventForQuantity(eventObj)
                                        }
                                      >
                                        {(selectedEventForQuantity?.id ===
                                          eventObj.id && (
                                          <EventCellQuantityEdit
                                            event={eventObj}
                                            onUpdate={handleEventQuantityUpdate}
                                            onClose={() =>
                                              setSelectedEventForQuantity(null)
                                            }
                                          />
                                        )) ||
                                          eventObj.quantity}
                                      </div>
                                      <div className="border-content2 w-[120px] text-right">
                                        {formatCurrency(eventObj.amount)}
                                      </div>
                                      <div
                                        className={clsx(
                                          "border-content2 w-[120px] text-right",
                                        )}
                                      >
                                        {formatCurrency(
                                          Number(eventObj.amount) *
                                            Number(eventObj.quantity),
                                        )}
                                      </div>
                                      <div className="border-content2 w-[90px]">
                                        {eventObj.currency?.symbol}
                                      </div>
                                      <div
                                        className={clsx(
                                          "border-content2 w-[120px] cursor-no-drop text-right",
                                          eventObj.type === "EXPENSE" &&
                                            "text-danger",
                                          eventObj.type === "INCOME" &&
                                            "text-success",
                                        )}
                                      >
                                        {formatCurrency(eventObj.exchangeRate)}
                                      </div>
                                      <div className="border-content2 w-[210px]">
                                        <span>
                                          {showOriginalText &&
                                          eventObj.original_text
                                            ? eventObj.original_text
                                            : eventObj.description}
                                        </span>
                                      </div>
                                      <div
                                        className="border-content2 group relative w-[180px] cursor-pointer"
                                        data-cell-name="event-categories"
                                        onClick={() =>
                                          setSelectedEventForCategories(
                                            eventObj,
                                          )
                                        }
                                      >
                                        {eventObj.categories?.map(
                                          (category) => (
                                            <Chip
                                              size="sm"
                                              variant="dot"
                                              startContent={
                                                <Circle
                                                  stroke={category.color}
                                                  size={12}
                                                />
                                              }
                                              classNames={{
                                                content: `text-xs`,
                                              }}
                                            >
                                              {category.name}
                                            </Chip>
                                          ),
                                        )}
                                        {selectedEventForCategories?.id ===
                                          eventObj.id && (
                                          <EventCellCategoriesSelect
                                            event={eventObj}
                                            availableCategories={categories}
                                            onUpdate={(eventId, categoryIds) =>
                                              handleEventCategoryUpdate(
                                                eventId,
                                                categoryIds,
                                                eventObj.event_date,
                                                eventObj,
                                              )
                                            }
                                            onClose={() =>
                                              setSelectedEventForCategories(
                                                null,
                                              )
                                            }
                                          />
                                        )}
                                      </div>
                                      <div className="border-content2 w-[70px] items-end text-right">
                                        <Trash
                                          className="stroke-content3 hover:stroke-danger cursor-pointer"
                                          size={12}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Day Stats */}
                              <div className="group-hover:bg-content2 border-content2 [&>div]:border-b-content2 w-[120px] border-r-[0.5px] border-l-[0.5px] text-right text-xs [&>div]:px-1 [&>div]:not-[:last-child]:border-b-[0.5px]">
                                <div className="text-success">
                                  <span>
                                    {formatCurrency(
                                      (
                                        (
                                          calendarV2Data.stats[year][
                                            month
                                          ] as MonthStats
                                        )[day] as DayStats
                                      ).totalIncome,
                                    )}
                                  </span>
                                </div>
                                <div className="text-danger">
                                  <span>
                                    {formatCurrency(
                                      (
                                        (
                                          calendarV2Data.stats[year][
                                            month
                                          ] as MonthStats
                                        )[day] as DayStats
                                      ).totalExpenses,
                                    )}
                                  </span>
                                </div>
                                <div
                                  className={clsx(
                                    "flex items-center justify-end",
                                    Number(
                                      (
                                        (
                                          calendarV2Data.stats[year][
                                            month
                                          ] as MonthStats
                                        )[day] as DayStats
                                      ).net,
                                    ) > 0
                                      ? "text-success"
                                      : "text-danger",
                                  )}
                                >
                                  <Diff size={9} />
                                  <span>
                                    {(() => {
                                      let net = new Decimal(
                                        (
                                          (
                                            calendarV2Data.stats[year][
                                              month
                                            ] as MonthStats
                                          )[day] as DayStats
                                        ).net,
                                      );
                                      net = net.lt(0) ? net.times(-1) : net;
                                      return formatCurrency(net.toString());
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Month Stats */}
                    <div className="border-content2 [&>div]:border-b-content2 w-[120px] border-r-[0.5px] border-l-[0.5px] text-right text-xs [&>div]:px-1 [&>div]:not-[:last-child]:border-b-[0.5px]">
                      <div className="text-success">
                        <span>
                          {formatCurrency(
                            (calendarV2Data.stats[year][month] as MonthStats)
                              .stats.totalIncome,
                          )}
                        </span>
                      </div>
                      <div className="text-danger">
                        <span>
                          {formatCurrency(
                            (calendarV2Data.stats[year][month] as MonthStats)
                              .stats.totalExpenses,
                          )}
                        </span>
                      </div>
                      <div
                        className={clsx(
                          "flex items-center justify-end",
                          Number(
                            (calendarV2Data.stats[year][month] as MonthStats)
                              .stats.net,
                          ) > 0
                            ? "text-success"
                            : "text-danger",
                        )}
                      >
                        <Diff size={9} />
                        <span>
                          {(() => {
                            let net = new Decimal(
                              (
                                calendarV2Data.stats[year][month] as MonthStats
                              ).stats.net,
                            );
                            net = net.lt(0) ? net.times(-1) : net;
                            return formatCurrency(net.toString());
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Year Stats */}
          <div className="border-content2 [&>div]:border-b-content2 w-[180px] border-r-[0.5px] border-l-[0.5px] text-right text-xs [&>div]:px-1 [&>div]:not-[:last-child]:border-b-[0.5px]">
            <span className="text-content4 mb-1 block text-center">
              {year} Income - Expenses
            </span>
            <div className="text-success flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                {Number(
                  calendarV2Data.stats[year].stats?.totalIncomePercentChange,
                ) >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {calendarV2Data.stats[year].stats?.totalIncomePercentChange}%
              </div>
              <Divider orientation="vertical" className="h-3" />
              <span className="w-6/12">
                {formatCurrency(calendarV2Data.stats[year].stats.totalIncome)}
              </span>
            </div>
            <div className="text-danger flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                {Number(
                  calendarV2Data.stats[year].stats?.totalExpensesPercentChange,
                ) >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {calendarV2Data.stats[year].stats?.totalExpensesPercentChange}%
              </div>
              <Divider orientation="vertical" className="h-3" />
              <span className="w-6/12">
                {formatCurrency(calendarV2Data.stats[year].stats.totalExpenses)}
              </span>
            </div>
            <div
              className={clsx(
                "flex items-center justify-between gap-1",
                Number(calendarV2Data.stats[year].stats.net) > 0
                  ? "text-success"
                  : "text-danger",
              )}
            >
              <div className="flex items-center gap-1">
                {Number(calendarV2Data.stats[year].stats?.netPercentChange) >=
                0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {calendarV2Data.stats[year].stats?.netPercentChange}%
              </div>
              <Divider orientation="vertical" className="h-3" />
              <div className="flex w-6/12 items-center justify-end">
                <Diff size={9} />
                <span>
                  {(() => {
                    let net = new Decimal(calendarV2Data.stats[year].stats.net);
                    net = net.lt(0) ? net.times(-1) : net;
                    return formatCurrency(net.toString());
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};
