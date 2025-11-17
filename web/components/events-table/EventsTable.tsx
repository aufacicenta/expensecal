import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { EventsTableProps } from "./EventsTable.types";

import { formatCurrency } from "@/lib/currency/formatter";
import { formatDayShort, formatMonthShort } from "@/lib/date/formatters";
import clsx from "clsx";
import { ArrowLeftRight, ListFilter, Trash } from "lucide-react";
import { useEffect } from "react";

export const EventsTable: React.FC<EventsTableProps> = ({}) => {
  const { calendarV2Data, loading, loadCalendarV2 } = useCalendarV2Context();

  useEffect(() => {
    if (!!calendarV2Data) return;

    // Load calendar data on mount
    loadCalendarV2();
  }, []);

  if (!calendarV2Data) return "Loading...";

  return (
    <section className="relative pt-[33px]">
      <nav className="[&>div]:border-content3 text-content4 bg-background fixed top-0 left-0 flex w-full items-center text-xs font-semibold [&>div]:flex [&>div]:items-center [&>div]:gap-1 [&>div]:border-[0.5px] [&>div]:p-1">
        <div className="hover:text-content4-foreground w-[120px] cursor-pointer justify-center">
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
        <div className="hover:text-content4-foreground w-[180px] cursor-pointer">
          <span>Categories</span>
          <ListFilter size={12} />
        </div>
        <div className="hover:text-content4-foreground w-[180px] cursor-pointer">
          <span>Description</span>
          <ArrowLeftRight size={12} />
        </div>
        <div className="w-[210px]">
          <span>Original Text</span>
        </div>
        <div className="w-[210px] justify-end">
          <span>Actions</span>
        </div>
      </nav>
      {Object.entries(calendarV2Data || {}).map(([year, yearObj]) => (
        <div className="border-content4 flex border-b" key={year}>
          <div className="border-content2 flex w-[120px] flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0">
            {year}
          </div>
          <div className="flex flex-col">
            {Object.entries(yearObj)
              .sort(([monthA], [monthB]) => Number(monthA) - Number(monthB))
              .map(([month, monthObj]) => (
                <div
                  className="border-content4 flex border-b-[0.5px] [&:not(:last-child)]:border-b"
                  key={`${year}-${month}`}
                >
                  <div className="border-content2 flex w-[120px] flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0">
                    {formatMonthShort(`${year}-${month}`)}
                  </div>
                  <div className="flex flex-col">
                    {Object.entries(monthObj)
                      .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
                      .map(([day, events]) => (
                        <div
                          className="group flex"
                          key={`${year}-${month}-${day}`}
                        >
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
                                  "hover:bg-content2 flex flex-1 [&>div]:flex [&>div]:flex-col [&>div]:justify-center [&>div]:border-[0.5px] [&>div]:border-b-0 [&>div]:p-1",
                                  events.length === 1 && "h-full",
                                )}
                                key={eventObj.id}
                              >
                                <div className="border-content2 w-[120px] text-right">
                                  {eventObj.quantity}
                                </div>
                                <div className="border-content2 w-[120px] text-right">
                                  {formatCurrency(eventObj.amount)}
                                </div>
                                <div
                                  className={clsx(
                                    "border-content2 w-[120px] text-right",
                                    eventObj.type === "EXPENSE" &&
                                      "text-danger",
                                    eventObj.type === "INCOME" &&
                                      "text-success",
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
                                <div className="border-content2 w-[120px] text-right">
                                  $0.00
                                </div>
                                <div className="border-content2 w-[180px]">
                                  {eventObj.categories?.map((category) => (
                                    <span className="text-xs">
                                      {category.name},{" "}
                                    </span>
                                  ))}
                                </div>
                                <div className="border-content2 w-[180px] text-xs">
                                  <span>{eventObj.description}</span>
                                </div>
                                <div className="border-content2 w-[210px] overflow-x-auto text-xs">
                                  <span className="block w-max">
                                    {eventObj.original_text}
                                  </span>
                                </div>
                                <div className="border-content2 w-[210px] items-end text-right">
                                  <Trash
                                    className="stroke-content3 hover:stroke-danger cursor-pointer"
                                    size={12}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
};
