import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { EventsTableProps } from "./EventsTable.types";

import { formatMonthShort } from "@/lib/date/formatters";
import { Trash } from "lucide-react";
import { useEffect } from "react";

function generateRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    key: index.toString(),
    name: `Item ${index + 1}`,
    value: `Value ${index + 1}`,
  }));
}

export const EventsTable: React.FC<EventsTableProps> = ({}) => {
  const {
    calendarV2Data,
    currentMonth,
    loading,
    goToPreviousMonth,
    goToNextMonth,
    goToMonth,
    loadCalendarV2,
  } = useCalendarV2Context();

  useEffect(() => {
    if (!!calendarV2Data) return;

    // Load calendar data on mount
    loadCalendarV2();
  }, []);

  if (!calendarV2Data) return "Loading...";

  return (
    <section>
      {Object.entries(calendarV2Data || {}).map(([year, yearObj]) => (
        <div className="border-content4 flex border-b" key={year}>
          <div className="border-content2 flex w-[120px] flex-col items-center justify-center border-[0.5px]">
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
                  <div className="border-content2 flex w-[120px] flex-col items-center justify-center border-[0.5px]">
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
                          <div className="border-content2 group-hover:bg-content2 flex w-[120px] flex-col items-center justify-center border-[0.5px]">
                            {day}
                          </div>
                          <div className="">
                            {events.map((eventObj) => (
                              <div
                                className="hover:bg-content2 flex [&>div]:flex [&>div]:flex-col [&>div]:justify-center [&>div]:border-[0.5px] [&>div]:px-1"
                                key={eventObj.id}
                              >
                                <div className="border-content2 w-[120px] text-right">
                                  {eventObj.quantity}
                                </div>
                                <div className="border-content2 w-[120px] text-right">
                                  {Number(eventObj.amount).toFixed(2)}
                                </div>
                                <div className="border-content2 w-[120px] text-right">
                                  {(
                                    Number(eventObj.amount) *
                                    Number(eventObj.quantity)
                                  ).toFixed(2)}
                                </div>
                                <div className="border-content2 w-[70px]">
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
                                <div className="border-content2 w-[210px] text-xs">
                                  <span>{eventObj.original_text}</span>
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
