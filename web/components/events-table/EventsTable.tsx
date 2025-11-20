import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { useCurrencyContext } from "@/context/Currency/useCurrencyContext";
import { useEventCategoriesContext } from "@/context/EventCategories/useEventCategoriesContext";
import { useEventsContext } from "@/context/Events/useEventsContext";
import { EventsTableProps } from "./EventsTable.types";

import { DeleteMode } from "@/app/api/v1/events/[id]/types";
import {
  CalendarEvent,
  DayStats,
  MonthStats,
} from "@/app/api/v2/calendar/types";
import { formatCurrency } from "@/lib/currency/formatter";
import { formatDayShort, formatMonthShort } from "@/lib/date/formatters";
import { EventAttributes } from "@expensecal/database/models/Event";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import clsx from "clsx";
import Decimal from "decimal.js";
import {
  ArrowLeftRight,
  CalendarFold,
  Circle,
  ListFilter,
  Trash,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { StaggerLoadingAnimation } from "../stagger-loading-animation/StaggerLoadingAnimation";
import { DeleteEventConfirmationModal } from "./delete-event-confirmation-modal/DeleteEventConfirmationModal";
import { EventCellAmountEdit } from "./event-cell-amount-edit/EventCellAmountEdit";
import { EventCellCategoriesSelect } from "./event-cell-categories-select/EventCellCategoriesSelect";
import { EventCellCurrencyEdit } from "./event-cell-currency-edit/EventCellCurrencyEdit";
import { EventCellDateEdit } from "./event-cell-date-edit/EventCellDateEdit";
import { EventCellQuantityEdit } from "./event-cell-quantity-edit/EventCellQuantityEdit";

// @TODO handle an edge case with EventCellDateEdit where editing a recurring event may need to update all the dates in the series.
export const EventsTable: React.FC<EventsTableProps> = ({}) => {
  const {
    calendarV2Data,
    loadCalendarV2,
    actionStates: calendarV2ContextActionStates,
  } = useCalendarV2Context();
  const {
    updateEvent,
    deleteEvent,
    actionStates: eventsContextActionStates,
    deleteEventMultiple,
  } = useEventsContext();
  const { categories } = useEventCategoriesContext();
  const { currencies } = useCurrencyContext();
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [selectedEventForQuantity, setSelectedEventForQuantity] =
    useState<CalendarEvent | null>(null);
  const [selectedEventForAmount, setSelectedEventForAmount] =
    useState<CalendarEvent | null>(null);
  const [selectedEventForCurrency, setSelectedEventForCurrency] =
    useState<CalendarEvent | null>(null);
  const [selectedEventForDelete, setSelectedEventForDelete] =
    useState<CalendarEvent | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    new Set(),
  );

  const handleEventCategoryUpdate = async (
    eventId: string,
    categoryIds: string[],
    eventDate: Date,
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

  const handleEventAmountUpdate = async (
    eventId: string,
    amount: EventAttributes["amount"],
    eventDate: Date,
  ) => {
    // Update the event with new amount
    await updateEvent(
      eventId,
      {
        amount,
      },
      eventDate,
    );
  };

  const handleEventCurrencyUpdate = async (
    eventId: string,
    currencyId: string,
    eventDate: Date,
  ) => {
    // Update the event with new currency
    await updateEvent(
      eventId,
      {
        currency_id: currencyId,
      },
      eventDate,
    );
  };

  const handleEventDateUpdate = async (
    eventId: string,
    newDate: Date,
    oldDate: Date,
  ) => {
    // Update the event with new date
    await updateEvent(
      eventId,
      {
        event_date: newDate,
      },
      oldDate,
    );
  };

  const handleEventDelete = (event: CalendarEvent) => {
    setSelectedEventForDelete(event);
  };

  const handleConfirmDelete = async (deleteMode: DeleteMode) => {
    if (selectedEventIds.size > 0 && selectedEventForDelete) {
      // Multiple delete if events are selected
      try {
        await handleBulkDelete(deleteMode);
        setSelectedEventForDelete(null);
      } catch (error) {
        console.error("Failed to delete multiple events:", error);
      }
    } else if (selectedEventForDelete) {
      // Single delete
      try {
        await deleteEvent(selectedEventForDelete.id!, deleteMode);
        setSelectedEventForDelete(null);
      } catch (error) {
        console.error("Failed to delete event:", error);
      }
    }
  };

  const handleToggleEventSelection = (eventId: string) => {
    setSelectedEventIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async (deleteMode: DeleteMode = "single") => {
    if (selectedEventIds.size === 0) return;

    try {
      await deleteEventMultiple(Array.from(selectedEventIds), deleteMode);
      setSelectedEventIds(new Set());
    } catch (error) {
      console.error("Failed to delete multiple events:", error);
    }
  };

  const handleToggleDaySelection = (events: CalendarEvent[]) => {
    const dayEventIds = events
      .map((event) => event.id)
      .filter((id): id is string => id !== undefined);

    setSelectedEventIds((prev) => {
      const newSet = new Set(prev);
      const allDayEventsSelected = dayEventIds.every((id) => newSet.has(id));

      if (allDayEventsSelected) {
        // Deselect all events in this day
        dayEventIds.forEach((id) => newSet.delete(id));
      } else {
        // Select all events in this day
        dayEventIds.forEach((id) => newSet.add(id));
      }

      return newSet;
    });
  };

  const handleToggleMonthSelection = (
    monthObj: Record<string, CalendarEvent[]>,
  ) => {
    const monthEventIds = Object.values(monthObj)
      .flatMap((events) => events.map((event) => event.id))
      .filter((id): id is string => id !== undefined);

    setSelectedEventIds((prev) => {
      const newSet = new Set(prev);
      const allMonthEventsSelected = monthEventIds.every((id) =>
        newSet.has(id),
      );

      if (allMonthEventsSelected) {
        // Deselect all events in this month
        monthEventIds.forEach((id) => newSet.delete(id));
      } else {
        // Select all events in this month
        monthEventIds.forEach((id) => newSet.add(id));
      }

      return newSet;
    });
  };

  const handleToggleYearSelection = (
    yearObj: Record<string, Record<string, CalendarEvent[]>>,
  ) => {
    const yearEventIds = Object.values(yearObj)
      .flatMap((monthObj) =>
        Object.values(monthObj).flatMap((events) =>
          events.map((event) => event.id),
        ),
      )
      .filter((id): id is string => id !== undefined);

    setSelectedEventIds((prev) => {
      const newSet = new Set(prev);
      const allYearEventsSelected = yearEventIds.every((id) => newSet.has(id));

      if (allYearEventsSelected) {
        // Deselect all events in this year
        yearEventIds.forEach((id) => newSet.delete(id));
      } else {
        // Select all events in this year
        yearEventIds.forEach((id) => newSet.add(id));
      }

      return newSet;
    });
  };

  const getLoadingStateComponent = () => (
    <section className="bg-background/70 fixed top-0 right-0 bottom-0 left-0 z-50 h-screen w-screen">
      <nav className="absolute top-0 right-0 left-0 flex w-full justify-between [&>div]:p-4">
        <div>
          <span className="font-mono">ExpenseCal</span>
        </div>
        <div>
          <span className="font-mono">Loading...</span>
        </div>
      </nav>
      <StaggerLoadingAnimation />
    </section>
  );

  useEffect(() => {
    if (!!calendarV2Data) return;

    // Load calendar data on mount
    loadCalendarV2();
  }, []);

  if (!calendarV2Data) return getLoadingStateComponent();

  return (
    <section className="relative w-fit overflow-x-auto pt-[33px]">
      {/* Loading State Over Existing Calendar*/}
      {(calendarV2ContextActionStates.loadCalendarV2.isLoading ||
        eventsContextActionStates.deleteEvent.isLoading ||
        eventsContextActionStates.deleteEventMultiple.isLoading) &&
        getLoadingStateComponent()}

      {/* Fixed Table Nav */}
      <nav className="[&>div]:border-content3 text-content4 bg-background fixed top-0 left-0 flex w-fit items-center text-xs font-semibold [&>div]:flex [&>div]:h-[25px] [&>div]:items-center [&>div]:gap-1 [&>div]:border-[0.5px] [&>div]:p-1">
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
        <div className="w-[70px] justify-center">
          <Checkbox
            isSelected={false}
            size="sm"
            classNames={{ wrapper: "me-0", base: "p-0" }}
          />
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
            <div
              className="border-content2 group hover:bg-content1 flex w-[180px] cursor-pointer flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0 p-1 transition-colors"
              data-cell-name="event-year"
              onClick={() => handleToggleYearSelection(yearObj)}
            >
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
                      <div
                        className="border-content2 group hover:bg-content1 flex w-[120px] cursor-pointer flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0 p-1 transition-colors"
                        data-cell-name="event-month"
                        onClick={() => handleToggleMonthSelection(monthObj)}
                      >
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
                                <div
                                  className="border-content2 group-hover:bg-content2 hover:bg-content1 flex w-[120px] cursor-pointer flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0 p-1 transition-colors"
                                  data-cell-name="event-day"
                                  onClick={() =>
                                    handleToggleDaySelection(events)
                                  }
                                >
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
                                        className="border-content2 group hover:bg-content1 relative w-[70px] cursor-pointer items-center transition-colors"
                                        data-cell-name="event-day-row-checkbox"
                                      >
                                        <Checkbox
                                          isSelected={selectedEventIds.has(
                                            eventObj.id || "",
                                          )}
                                          onChange={() =>
                                            handleToggleEventSelection(
                                              eventObj.id || "",
                                            )
                                          }
                                          color="default"
                                          size="md"
                                          classNames={{
                                            wrapper: "me-0",
                                            base: "p-0",
                                          }}
                                        />
                                      </div>
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
                                      <div
                                        className="border-content2 group hover:bg-content1 relative w-[120px] cursor-pointer text-right transition-colors"
                                        data-cell-name="event-amount"
                                        onClick={() =>
                                          setSelectedEventForAmount(eventObj)
                                        }
                                      >
                                        {(selectedEventForAmount?.id ===
                                          eventObj.id && (
                                          <EventCellAmountEdit
                                            event={eventObj}
                                            onUpdate={handleEventAmountUpdate}
                                            onClose={() =>
                                              setSelectedEventForAmount(null)
                                            }
                                          />
                                        )) ||
                                          formatCurrency(eventObj.amount)}
                                      </div>
                                      <div
                                        className={clsx(
                                          "border-content2 w-[120px] cursor-no-drop text-right",
                                        )}
                                      >
                                        {formatCurrency(
                                          Number(eventObj.amount) *
                                            Number(eventObj.quantity),
                                        )}
                                      </div>
                                      <div
                                        className="border-content2 group hover:bg-content1 relative w-[90px] cursor-pointer"
                                        data-cell-name="event-currency"
                                        onClick={() =>
                                          setSelectedEventForCurrency(eventObj)
                                        }
                                      >
                                        {selectedEventForCurrency?.id ===
                                          eventObj.id && (
                                          <EventCellCurrencyEdit
                                            event={eventObj}
                                            availableCurrencies={currencies}
                                            onUpdate={handleEventCurrencyUpdate}
                                            onClose={() =>
                                              setSelectedEventForCurrency(null)
                                            }
                                          />
                                        )}
                                        <span>{eventObj.currency?.symbol}</span>
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
                                      >
                                        <Dropdown>
                                          <DropdownTrigger>
                                            <div className="flex h-full flex-wrap gap-1">
                                              {eventObj.categories &&
                                              eventObj.categories.length > 0 ? (
                                                eventObj.categories.map(
                                                  (category) => (
                                                    <Chip
                                                      key={category.id}
                                                      size="sm"
                                                      variant="dot"
                                                      startContent={
                                                        <Circle
                                                          stroke={
                                                            category.color
                                                          }
                                                          size={12}
                                                          className="mr-1"
                                                        />
                                                      }
                                                      classNames={{
                                                        content: `text-xs`,
                                                      }}
                                                    >
                                                      {category.name}
                                                    </Chip>
                                                  ),
                                                )
                                              ) : (
                                                <div className="w-full"></div>
                                              )}
                                            </div>
                                          </DropdownTrigger>
                                          <DropdownMenu variant="light">
                                            <DropdownItem
                                              key="edit-categories"
                                              isReadOnly
                                            >
                                              <EventCellCategoriesSelect
                                                event={eventObj}
                                                availableCategories={categories}
                                                onUpdate={(
                                                  eventId,
                                                  categoryIds,
                                                ) =>
                                                  handleEventCategoryUpdate(
                                                    eventId,
                                                    categoryIds,
                                                    eventObj.event_date,
                                                  )
                                                }
                                                onClose={() => {
                                                  // Dropdown will close automatically
                                                }}
                                              />
                                            </DropdownItem>
                                          </DropdownMenu>
                                        </Dropdown>
                                      </div>
                                      <div className="border-content2 w-[70px]">
                                        <div
                                          className="flex justify-end gap-1"
                                          data-cell-name="event-actions"
                                        >
                                          <Dropdown>
                                            <DropdownTrigger>
                                              <CalendarFold
                                                className="stroke-content3 hover:stroke-primary cursor-pointer"
                                                size={12}
                                              />
                                            </DropdownTrigger>
                                            <DropdownMenu>
                                              <DropdownItem
                                                key="edit-date"
                                                isReadOnly
                                              >
                                                <EventCellDateEdit
                                                  event={eventObj}
                                                  onUpdate={
                                                    handleEventDateUpdate
                                                  }
                                                  onClose={() => {
                                                    // Dropdown will close automatically
                                                  }}
                                                />
                                              </DropdownItem>
                                            </DropdownMenu>
                                          </Dropdown>
                                          <div>
                                            <Trash
                                              className="stroke-content3 hover:stroke-danger cursor-pointer"
                                              size={12}
                                              onClick={() => {
                                                if (
                                                  selectedEventIds.size > 0 &&
                                                  selectedEventIds.has(
                                                    eventObj.id || "",
                                                  )
                                                ) {
                                                  // Delete only if this event is part of the selected set
                                                  handleEventDelete(eventObj);
                                                } else if (
                                                  selectedEventIds.size === 0
                                                ) {
                                                  // Single delete when no events are selected
                                                  handleEventDelete(eventObj);
                                                }
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Day Stats */}
                              <div className="border-content2 [&>div]:border-b-content2 w-[120px] border-r-[0.5px] border-l-[0.5px] text-right text-xs [&>div]:px-1 [&>div]:not-[:last-child]:border-b-[0.5px]">
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
                                  <span>
                                    {(() => {
                                      const net = new Decimal(
                                        (
                                          (
                                            calendarV2Data.stats[year][
                                              month
                                            ] as MonthStats
                                          )[day] as DayStats
                                        ).net,
                                      );
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
                        <span>
                          {(() => {
                            const net = new Decimal(
                              (
                                calendarV2Data.stats[year][month] as MonthStats
                              ).stats.net,
                            );
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
                <span>
                  {(() => {
                    const net = new Decimal(
                      calendarV2Data.stats[year].stats.net,
                    );
                    return formatCurrency(net.toString());
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
      <DeleteEventConfirmationModal
        isOpen={!!selectedEventForDelete}
        isRecurring={!!selectedEventForDelete?.parent_event_id}
        isMultiple={selectedEventIds.size > 1}
        multipleCount={selectedEventIds.size}
        onClose={() => setSelectedEventForDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
};
