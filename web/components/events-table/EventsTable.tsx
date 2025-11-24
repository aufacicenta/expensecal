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
  CalendarSync,
  Circle,
  CircleCheckBig,
  CircleX,
  ListChevronsUpDown,
  ListFilter,
  Loader2,
  Trash,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { StaggerLoadingAnimation } from "../stagger-loading-animation/StaggerLoadingAnimation";
import { ThemeSwitch } from "../theme-switch";

import { EventsTableProps } from "./EventsTable.types";
import { DeleteEventConfirmationModal } from "./delete-event-confirmation-modal/DeleteEventConfirmationModal";
import {
  EventCellAmountEdit,
  type EventCellAmountEditHandle,
} from "./event-cell-amount-edit/EventCellAmountEdit";
import { EventCellCategoriesSelect } from "./event-cell-categories-select/EventCellCategoriesSelect";
import { EventCellCurrencyEdit } from "./event-cell-currency-edit/EventCellCurrencyEdit";
import { EventCellDateEdit } from "./event-cell-date-edit/EventCellDateEdit";
import {
  EventCellQuantityEdit,
  type EventCellQuantityEditHandle,
} from "./event-cell-quantity-edit/EventCellQuantityEdit";

import { getStructureType } from "@/lib/events/getStructureType";
import {
  aggregateChildEventsExchangeRate,
  aggregateChildEventsQuantity,
  aggregateChildEventsTotalAmount,
} from "@/lib/events/aggregators";
import {
  formatDayShort,
  formatMonthShort,
  toDateString,
} from "@/lib/date/formatters";
import { formatCurrency } from "@/lib/currency/formatter";
import { useEventsContext } from "@/context/Events/useEventsContext";
import { useEventCategoriesContext } from "@/context/EventCategories/useEventCategoriesContext";
import { useCurrencyContext } from "@/context/Currency/useCurrencyContext";
import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import {
  CalendarEvent,
  DayStats,
  MonthStats,
} from "@/app/api/v2/calendar/types";
import { DeleteMode } from "@/app/api/v1/events/[id]/types";

// @TODO handle an edge case with EventCellDateEdit where editing a recurring event may need to update all the dates in the series.
export const EventsTable: React.FC<EventsTableProps> = ({}) => {
  const { calendarV2Data, loadCalendarV2 } = useCalendarV2Context();
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
  const [selectedEventForDelete, setSelectedEventForDelete] =
    useState<CalendarEvent | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    new Set(),
  );
  const [dirtyEventIds, setDirtyEventIds] = useState<
    Map<string, Set<"quantity" | "amount">>
  >(new Map());
  const [loadingEventIds, setLoadingEventIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set(),
  );
  const amountEditRefs = useRef<Map<string, EventCellAmountEditHandle>>(
    new Map(),
  );
  const quantityEditRefs = useRef<Map<string, EventCellQuantityEditHandle>>(
    new Map(),
  );

  const markEventAsDirty = (
    eventId: string,
    fieldType: "quantity" | "amount",
  ) => {
    setDirtyEventIds((prev) => {
      const newMap = new Map(prev);
      const fieldSet = newMap.get(eventId) || new Set();

      fieldSet.add(fieldType);
      newMap.set(eventId, fieldSet);

      return newMap;
    });
  };

  const clearEventDirty = (
    eventId: string,
    fieldType?: "quantity" | "amount",
  ) => {
    setDirtyEventIds((prev) => {
      const newMap = new Map(prev);
      const fieldSet = newMap.get(eventId);

      if (!fieldSet) return prev;

      if (fieldType) {
        // Clear only specific field type
        fieldSet.delete(fieldType);
        if (fieldSet.size === 0) {
          newMap.delete(eventId);
        }
      } else {
        // Clear all fields for this event
        newMap.delete(eventId);
      }

      return newMap;
    });
  };

  const isAnyFieldLoading = (eventId: string): boolean => {
    const isFieldLoading = loadingEventIds.has(eventId);

    return isFieldLoading;
  };

  const handleAmountLoadingChange = (eventId: string, isLoading: boolean) => {
    setLoadingEventIds((prev) => {
      const newSet = new Set(prev);

      if (isLoading) {
        newSet.add(eventId);
      } else {
        newSet.delete(eventId);
      }

      return newSet;
    });
  };

  const handleQuantityLoadingChange = (eventId: string, isLoading: boolean) => {
    setLoadingEventIds((prev) => {
      const newSet = new Set(prev);

      if (isLoading) {
        newSet.add(eventId);
      } else {
        newSet.delete(eventId);
      }

      return newSet;
    });
  };

  const registerAmountEditRef = (
    eventId: string,
    ref: EventCellAmountEditHandle | null,
  ) => {
    if (ref) {
      amountEditRefs.current.set(eventId, ref);
    } else {
      amountEditRefs.current.delete(eventId);
    }
  };

  const registerQuantityEditRef = (
    eventId: string,
    ref: EventCellQuantityEditHandle | null,
  ) => {
    if (ref) {
      quantityEditRefs.current.set(eventId, ref);
    } else {
      quantityEditRefs.current.delete(eventId);
    }
  };

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

    clearEventDirty(eventId || "", "quantity");
    registerQuantityEditRef(eventId || "", null);
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

    clearEventDirty(eventId || "", "amount");
    registerAmountEditRef(eventId || "", null);
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

  const handleSaveAllDirtyFields = (eventId: string) => {
    const dirtyFields = dirtyEventIds.get(eventId);

    if (!dirtyFields) return;

    try {
      if (dirtyFields.has("quantity")) {
        quantityEditRefs.current.get(eventId)?.save();
      }
      if (dirtyFields.has("amount")) {
        amountEditRefs.current.get(eventId)?.save();
      }
    } catch (error) {
      console.error("Failed to save event:", error);
    }
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

  const handleToggleEventExpansion = (eventId: string) => {
    setExpandedEventIds((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }

      return newSet;
    });
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

  const getAllEventIds = (): string[] => {
    if (!calendarV2Data?.calendar) return [];

    return Object.values(calendarV2Data.calendar)
      .flatMap((yearObj) =>
        Object.values(yearObj).flatMap((monthObj) =>
          Object.values(monthObj).flatMap((events) =>
            events.map((event) => event.id),
          ),
        ),
      )
      .filter((id): id is string => id !== undefined);
  };

  const handleToggleAllSelection = () => {
    const allEventIds = getAllEventIds();

    if (allEventIds.length === 0) return;

    setSelectedEventIds((prev) => {
      const newSet = new Set(prev);
      const allEventsSelected = allEventIds.every((id) => newSet.has(id));

      if (allEventsSelected) {
        // Deselect all events
        allEventIds.forEach((id) => newSet.delete(id));
      } else {
        // Select all events
        allEventIds.forEach((id) => newSet.add(id));
      }

      return newSet;
    });
  };

  const getLoadingStateComponent = () => (
    <section className="bg-background/70 fixed top-0 right-0 bottom-0 left-0 z-[1000] h-screen w-screen">
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
    <section className="relative w-fit overflow-x-auto pt-[58px]">
      {/* Loading State Over Existing Calendar*/}
      {(eventsContextActionStates.deleteEvent.isLoading ||
        eventsContextActionStates.deleteEventMultiple.isLoading) &&
        getLoadingStateComponent()}

      {/* Fixed Table Nav */}
      <nav className="bg-background fixed top-0 left-0 z-50 text-xs">
        {/* App Top Bar */}
        <div className="flex w-screen items-center justify-between px-2 [&>div]:p-1">
          <div className="flex gap-1 font-mono">
            <span className="">ExpenseCal</span>
            <span className="text-default-400">v0.0.2</span>
          </div>
          <div className="text-right">
            <ThemeSwitch />
          </div>
        </div>

        {/* Table Columns */}
        <div className="text-default-400 [&>div]:border-default-300 flex w-fit items-center font-semibold [&>div]:flex [&>div]:h-[25px] [&>div]:items-center [&>div]:gap-1 [&>div]:border-[0.5px] [&>div]:p-1">
          <div className="hover:text-default-400-foreground w-[180px] cursor-pointer justify-center">
            <span>Year</span>
            <ListFilter size={12} />
          </div>
          <div className="hover:text-default-400-foreground w-[120px] cursor-pointer justify-center">
            <span>Month</span>
            <ListFilter size={12} />
          </div>
          <div className="w-[120px] justify-center">
            <span>Day</span>
          </div>
          <div className="w-[70px] justify-center">
            <Checkbox
              classNames={{ wrapper: "me-0", base: "p-0" }}
              isIndeterminate={
                selectedEventIds.size > 0 &&
                selectedEventIds.size < getAllEventIds().length
              }
              isSelected={
                selectedEventIds.size > 0 &&
                selectedEventIds.size === getAllEventIds().length
              }
              size="sm"
              onChange={handleToggleAllSelection}
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
          <div className="hover:text-default-400-foreground w-[90px] cursor-pointer">
            <span>Currency</span>
            <ListFilter size={12} />
          </div>
          <div className="w-[120px] justify-end">
            <span>Ex. Rate (USD)</span>
          </div>
          <div className="w-[90px] justify-center">
            <span>Type</span>
          </div>
          <div
            className="hover:text-default-400-foreground w-[210px] cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setShowOriginalText(!showOriginalText)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowOriginalText(!showOriginalText);
              }
            }}
          >
            <span>{showOriginalText ? "Original Text" : "Description"}</span>
            <ArrowLeftRight size={12} />
          </div>
          <div className="hover:text-default-400-foreground w-[180px] cursor-pointer">
            <span>Categories</span>
            <ListFilter size={12} />
          </div>
          <div className="w-[120px] justify-end">
            <span>Actions</span>
          </div>
        </div>
      </nav>

      {Object.entries(calendarV2Data.calendar || {}).map(([year, yearObj]) => (
        <div key={year} className="border-default-300 border-b">
          <div className="flex">
            <div
              className="border-default-300 group hover:bg-content1 flex w-[180px] cursor-pointer flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0 p-1 transition-colors"
              data-cell-name="event-year"
              role="button"
              tabIndex={0}
              onClick={() => handleToggleYearSelection(yearObj)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleToggleYearSelection(yearObj);
                }
              }}
            >
              {year}
            </div>
            <div className="flex flex-col">
              {Object.entries(yearObj)
                .sort(([monthA], [monthB]) => Number(monthA) - Number(monthB))
                .map(([month, monthObj]) => (
                  <div key={`${year}-${month}`} className="border-default-300">
                    <div className="flex">
                      <div
                        className="border-default-300 group hover:bg-content1 flex w-[120px] cursor-pointer flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0 p-1 transition-colors"
                        data-cell-name="event-month"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToggleMonthSelection(monthObj)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleMonthSelection(monthObj);
                          }
                        }}
                      >
                        {formatMonthShort(`${year}-${month}`)}
                      </div>
                      <div className="flex flex-col">
                        {Object.entries(monthObj)
                          .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
                          .map(([day, events]) => (
                            <div
                              key={`${year}-${month}-${day}`}
                              className="group border-b-default-300 last-of-type:border-b-0"
                            >
                              <div className="flex">
                                <div
                                  className="border-default-300 group-hover:bg-content2 hover:bg-content1 flex w-[120px] cursor-pointer flex-col items-center justify-center border-[0.5px] border-r-0 border-b-0 p-1 transition-colors"
                                  data-cell-name="event-day"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    handleToggleDaySelection(events)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      handleToggleDaySelection(events);
                                    }
                                  }}
                                >
                                  <span className="text-xs">
                                    {formatDayShort(`${year}-${month}-${day}`)}
                                  </span>
                                  <span>{day}</span>
                                </div>
                                <div className="">
                                  {/* Event Rows */}
                                  {events.map((eventObj) => (
                                    <div
                                      key={eventObj.id}
                                      className={clsx(
                                        expandedEventIds.has(
                                          eventObj.id || "",
                                        ) && "border-primary border-[0.5px]",
                                      )}
                                    >
                                      <div
                                        className={clsx(
                                          "hover:bg-content2 last-of-type:border-b-default-300 group-hover:bg-content2 [&>div]:border-default-300 flex flex-1 text-xs last-of-type:border-b-[0.5px] [&>div]:flex [&>div]:flex-col [&>div]:justify-center [&>div]:border-[0.5px] [&>div]:border-b-0 [&>div]:p-1",
                                          events.length === 1 && "h-full",
                                        )}
                                        data-cell-name="event-row"
                                      >
                                        <div
                                          className="group hover:bg-content1 relative w-[70px] cursor-pointer items-center transition-colors"
                                          data-cell-name="event-day-row-checkbox"
                                        >
                                          <Checkbox
                                            classNames={{
                                              wrapper: "me-0",
                                              base: "p-0",
                                            }}
                                            color="default"
                                            isSelected={selectedEventIds.has(
                                              eventObj.id || "",
                                            )}
                                            size="md"
                                            onChange={() =>
                                              handleToggleEventSelection(
                                                eventObj.id || "",
                                              )
                                            }
                                          />
                                        </div>
                                        <div
                                          className="group hover:bg-content1 relative w-[120px] cursor-pointer text-right transition-colors"
                                          data-cell-name="event-quantity"
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => {
                                            setSelectedEventForQuantity(
                                              eventObj,
                                            );
                                            markEventAsDirty(
                                              eventObj.id || "",
                                              "quantity",
                                            );
                                          }}
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Enter" ||
                                              e.key === " "
                                            ) {
                                              e.preventDefault();
                                              setSelectedEventForQuantity(
                                                eventObj,
                                              );
                                              markEventAsDirty(
                                                eventObj.id || "",
                                                "quantity",
                                              );
                                            }
                                          }}
                                        >
                                          {(selectedEventForQuantity?.id ===
                                            eventObj.id && (
                                            <EventCellQuantityEdit
                                              ref={(ref) => {
                                                if (ref) {
                                                  registerQuantityEditRef(
                                                    eventObj.id || "",
                                                    ref,
                                                  );
                                                }
                                                // Ignore null - keep the ref alive for save()
                                              }}
                                              event={eventObj}
                                              onClose={() => {
                                                setSelectedEventForQuantity(
                                                  null,
                                                );
                                              }}
                                              onLoadingChange={(isLoading) =>
                                                handleQuantityLoadingChange(
                                                  eventObj.id || "",
                                                  isLoading,
                                                )
                                              }
                                              onUpdate={
                                                handleEventQuantityUpdate
                                              }
                                            />
                                          )) ||
                                            eventObj.quantity}
                                        </div>
                                        <div
                                          className="group hover:bg-content1 relative w-[120px] cursor-pointer text-right transition-colors"
                                          data-cell-name="event-amount"
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => {
                                            setSelectedEventForAmount(eventObj);
                                            markEventAsDirty(
                                              eventObj.id || "",
                                              "amount",
                                            );
                                          }}
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Enter" ||
                                              e.key === " "
                                            ) {
                                              e.preventDefault();
                                              setSelectedEventForAmount(
                                                eventObj,
                                              );
                                              markEventAsDirty(
                                                eventObj.id || "",
                                                "amount",
                                              );
                                            }
                                          }}
                                        >
                                          {(selectedEventForAmount?.id ===
                                            eventObj.id && (
                                            <EventCellAmountEdit
                                              ref={(ref) => {
                                                if (ref) {
                                                  registerAmountEditRef(
                                                    eventObj.id || "",
                                                    ref,
                                                  );
                                                }
                                                // Ignore null - keep the ref alive for save()
                                              }}
                                              event={eventObj}
                                              onClose={() => {
                                                setSelectedEventForAmount(null);
                                              }}
                                              onLoadingChange={(isLoading) =>
                                                handleAmountLoadingChange(
                                                  eventObj.id || "",
                                                  isLoading,
                                                )
                                              }
                                              onUpdate={handleEventAmountUpdate}
                                            />
                                          )) ||
                                            formatCurrency(eventObj.amount)}
                                        </div>
                                        <div
                                          className={clsx(
                                            "w-[120px] cursor-no-drop text-right",
                                          )}
                                          data-cell-name="event-total-amount"
                                        >
                                          {formatCurrency(
                                            Number(eventObj.amount) *
                                              Number(eventObj.quantity),
                                          )}
                                        </div>
                                        <div
                                          className="group hover:bg-content1 relative w-[90px]"
                                          data-cell-name="event-currency"
                                        >
                                          <Dropdown>
                                            <DropdownTrigger>
                                              <span className="cursor-pointer">
                                                {eventObj.currency?.symbol}
                                              </span>
                                            </DropdownTrigger>
                                            <DropdownMenu variant="light">
                                              <DropdownItem
                                                key="edit-currency"
                                                isReadOnly
                                              >
                                                <EventCellCurrencyEdit
                                                  availableCurrencies={
                                                    currencies
                                                  }
                                                  event={eventObj}
                                                  onClose={() => {
                                                    // Dropdown will close automatically
                                                  }}
                                                  onUpdate={
                                                    handleEventCurrencyUpdate
                                                  }
                                                />
                                              </DropdownItem>
                                            </DropdownMenu>
                                          </Dropdown>
                                        </div>
                                        <div
                                          className={clsx(
                                            "w-[120px] cursor-no-drop text-right font-bold",
                                            eventObj.type === "EXPENSE" &&
                                              "text-danger",
                                            eventObj.type === "INCOME" &&
                                              "text-success",
                                          )}
                                          data-cell-name="event-exchange-rate"
                                        >
                                          {formatCurrency(
                                            eventObj.exchangeRate,
                                          )}
                                        </div>
                                        <div
                                          className="w-[90px] !flex-row items-center"
                                          data-cell-name="event-structure-type"
                                        >
                                          <Chip
                                            className="capitalize"
                                            size="sm"
                                            variant="bordered"
                                          >
                                            {getStructureType(eventObj)}
                                          </Chip>
                                        </div>
                                        <div
                                          className="w-[210px]"
                                          data-cell-name="event-description"
                                        >
                                          <span>
                                            {showOriginalText &&
                                            eventObj.original_text
                                              ? eventObj.original_text
                                              : eventObj.description}
                                          </span>
                                        </div>
                                        <div
                                          className="group relative w-[180px] cursor-pointer"
                                          data-cell-name="event-categories"
                                        >
                                          <Dropdown>
                                            <DropdownTrigger>
                                              <div className="flex h-full flex-wrap items-center gap-1">
                                                {eventObj.categories &&
                                                eventObj.categories.length >
                                                  0 ? (
                                                  eventObj.categories.map(
                                                    (category) => (
                                                      <Chip
                                                        key={category.id}
                                                        classNames={{
                                                          content: `text-xs`,
                                                        }}
                                                        size="sm"
                                                        startContent={
                                                          <Circle
                                                            className="mr-1"
                                                            size={12}
                                                            stroke={
                                                              category.color
                                                            }
                                                          />
                                                        }
                                                        variant="dot"
                                                      >
                                                        {category.name}
                                                      </Chip>
                                                    ),
                                                  )
                                                ) : (
                                                  <div className="w-full" />
                                                )}
                                              </div>
                                            </DropdownTrigger>
                                            <DropdownMenu variant="light">
                                              <DropdownItem
                                                key="edit-categories"
                                                isReadOnly
                                              >
                                                <EventCellCategoriesSelect
                                                  availableCategories={
                                                    categories
                                                  }
                                                  event={eventObj}
                                                  onClose={() => {
                                                    // Dropdown will close automatically
                                                  }}
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
                                                />
                                              </DropdownItem>
                                            </DropdownMenu>
                                          </Dropdown>
                                        </div>
                                        <div className="w-[120px]">
                                          <div
                                            className="flex justify-end gap-1"
                                            data-cell-name="event-actions"
                                          >
                                            {/* Event Update Confirm Actions - Show for any dirty event */}
                                            {dirtyEventIds.has(
                                              eventObj.id || "",
                                            ) && (
                                              <>
                                                <div
                                                  className="cursor-pointer"
                                                  role="button"
                                                  tabIndex={0}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSaveAllDirtyFields(
                                                      eventObj.id || "",
                                                    );
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (
                                                      e.key === "Enter" ||
                                                      e.key === " "
                                                    ) {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleSaveAllDirtyFields(
                                                        eventObj.id || "",
                                                      );
                                                    }
                                                  }}
                                                >
                                                  {isAnyFieldLoading(
                                                    eventObj.id || "",
                                                  ) ? (
                                                    <Loader2
                                                      className="stroke-primary animate-spin"
                                                      size={16}
                                                    />
                                                  ) : (
                                                    <CircleCheckBig
                                                      className="stroke-primary hover:stroke-default"
                                                      size={16}
                                                    />
                                                  )}
                                                </div>
                                                <div
                                                  className="cursor-pointer"
                                                  role="button"
                                                  tabIndex={0}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (
                                                      selectedEventForQuantity?.id ===
                                                      eventObj.id
                                                    ) {
                                                      registerQuantityEditRef(
                                                        eventObj.id || "",
                                                        null,
                                                      );
                                                      clearEventDirty(
                                                        eventObj.id || "",
                                                        "quantity",
                                                      );
                                                      setSelectedEventForQuantity(
                                                        null,
                                                      );
                                                    } else if (
                                                      selectedEventForAmount?.id ===
                                                      eventObj.id
                                                    ) {
                                                      registerAmountEditRef(
                                                        eventObj.id || "",
                                                        null,
                                                      );
                                                      clearEventDirty(
                                                        eventObj.id || "",
                                                        "amount",
                                                      );
                                                      setSelectedEventForAmount(
                                                        null,
                                                      );
                                                    }
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (
                                                      e.key === "Enter" ||
                                                      e.key === " "
                                                    ) {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      if (
                                                        selectedEventForQuantity?.id ===
                                                        eventObj.id
                                                      ) {
                                                        registerQuantityEditRef(
                                                          eventObj.id || "",
                                                          null,
                                                        );
                                                        clearEventDirty(
                                                          eventObj.id || "",
                                                          "quantity",
                                                        );
                                                        setSelectedEventForQuantity(
                                                          null,
                                                        );
                                                      } else if (
                                                        selectedEventForAmount?.id ===
                                                        eventObj.id
                                                      ) {
                                                        registerAmountEditRef(
                                                          eventObj.id || "",
                                                          null,
                                                        );
                                                        clearEventDirty(
                                                          eventObj.id || "",
                                                          "amount",
                                                        );
                                                        setSelectedEventForAmount(
                                                          null,
                                                        );
                                                      }
                                                    }
                                                  }}
                                                >
                                                  <CircleX
                                                    className="stroke-default-400 hover:stroke-danger"
                                                    size={16}
                                                  />
                                                </div>
                                                <Divider orientation="vertical" />
                                              </>
                                            )}
                                            {/* Event Update Confirm Actions End */}
                                            {/* @TODO make a single event recurring or in installments */}
                                            {getStructureType(eventObj) ===
                                              "single" && (
                                              <div>
                                                <CalendarSync
                                                  className="stroke-default-400 hover:stroke-primary cursor-pointer"
                                                  size={16}
                                                />
                                              </div>
                                            )}
                                            {!eventObj.parent_event_id &&
                                              (getStructureType(eventObj) ===
                                                "recurring" ||
                                                getStructureType(eventObj) ===
                                                  "installment") && (
                                                <div
                                                  role="button"
                                                  tabIndex={0}
                                                  onClick={() =>
                                                    handleToggleEventExpansion(
                                                      eventObj.id || "",
                                                    )
                                                  }
                                                  onKeyDown={(e) => {
                                                    if (
                                                      e.key === "Enter" ||
                                                      e.key === " "
                                                    ) {
                                                      e.preventDefault();
                                                      handleToggleEventExpansion(
                                                        eventObj.id || "",
                                                      );
                                                    }
                                                  }}
                                                >
                                                  <ListChevronsUpDown
                                                    className="stroke-default-400 hover:stroke-primary cursor-pointer"
                                                    size={16}
                                                  />
                                                </div>
                                              )}
                                            <Dropdown>
                                              <DropdownTrigger>
                                                <CalendarFold
                                                  className="stroke-default-400 hover:stroke-primary cursor-pointer"
                                                  size={16}
                                                />
                                              </DropdownTrigger>
                                              <DropdownMenu>
                                                <DropdownItem
                                                  key="edit-date"
                                                  isReadOnly
                                                >
                                                  <EventCellDateEdit
                                                    event={eventObj}
                                                    onClose={() => {
                                                      // Dropdown will close automatically
                                                    }}
                                                    onUpdate={
                                                      handleEventDateUpdate
                                                    }
                                                  />
                                                </DropdownItem>
                                              </DropdownMenu>
                                            </Dropdown>
                                            <div
                                              role="button"
                                              tabIndex={0}
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
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key === "Enter" ||
                                                  e.key === " "
                                                ) {
                                                  e.preventDefault();
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
                                                }
                                              }}
                                            >
                                              <Trash
                                                className="stroke-default-400 hover:stroke-danger cursor-pointer"
                                                size={16}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Child Events */}
                                      {expandedEventIds.has(
                                        eventObj.id || "",
                                      ) &&
                                        eventObj.childEvents !== undefined &&
                                        !!eventObj.childEvents.length &&
                                        eventObj.childEvents.length > 0 && (
                                          <>
                                            <div className="p-1 text-center text-xs">
                                              <span>Recurring Instances</span>
                                            </div>
                                            {eventObj.childEvents
                                              .sort(
                                                (a, b) =>
                                                  new Date(
                                                    a.event_date,
                                                  ).getTime() -
                                                  new Date(
                                                    b.event_date,
                                                  ).getTime(),
                                              )
                                              .map((childEvent) => (
                                                <div
                                                  key={`child-event-${childEvent.id}`}
                                                  className="hover:bg-content2 last-of-type:border-b-default-300 [&>div]:border-default-300 flex flex-1 text-xs last-of-type:border-b-[0.5px] [&>div]:flex [&>div]:flex-col [&>div]:justify-center [&>div]:border-[0.5px] [&>div]:border-b-0 [&>div]:p-1"
                                                  data-cell-name="child-event-row"
                                                >
                                                  <div
                                                    className="w-[70px]"
                                                    data-cell-name="child-event-checkbox"
                                                  >
                                                    {/* @TODO add a checkbox and allow selecting child events directly */}
                                                  </div>
                                                  <div
                                                    className="w-[120px] text-right"
                                                    data-cell-name="child-event-quantity"
                                                  >
                                                    {/* @TODO allow editing the quantity directly */}
                                                    {childEvent.quantity}
                                                  </div>
                                                  <div
                                                    className="w-[120px] text-right"
                                                    data-cell-name="child-event-amount"
                                                  >
                                                    {/* @TODO allow editing the amount directly */}
                                                    {formatCurrency(
                                                      childEvent.amount,
                                                    )}
                                                  </div>
                                                  <div
                                                    className="w-[120px] text-right"
                                                    data-cell-name="child-event-total-amount"
                                                  >
                                                    {formatCurrency(
                                                      new Decimal(
                                                        childEvent.amount,
                                                      )
                                                        .times(
                                                          new Decimal(
                                                            childEvent.quantity,
                                                          ),
                                                        )
                                                        .toString(),
                                                    )}
                                                  </div>
                                                  <div
                                                    className="w-[90px]"
                                                    data-cell-name="child-event-currency"
                                                  >
                                                    {
                                                      childEvent?.currency
                                                        ?.symbol
                                                    }
                                                  </div>
                                                  <div
                                                    className={clsx(
                                                      "w-[120px] cursor-no-drop text-right",
                                                      eventObj.type ===
                                                        "EXPENSE" &&
                                                        "text-danger",
                                                      eventObj.type ===
                                                        "INCOME" &&
                                                        "text-success",
                                                    )}
                                                    data-cell-name="child-event-exchange-rate"
                                                  >
                                                    {formatCurrency(
                                                      eventObj.exchangeRate,
                                                    )}
                                                  </div>
                                                  <div
                                                    className="w-[90px] !flex-row items-center"
                                                    data-cell-name="child-event-structure-type"
                                                  />
                                                  <div
                                                    className="flex w-[210px] !flex-row flex-wrap !justify-start gap-1"
                                                    data-cell-name="child-event-description"
                                                  >
                                                    <span>
                                                      {childEvent.description}
                                                    </span>
                                                    <span>-</span>
                                                    <span className="underline">
                                                      {toDateString(
                                                        childEvent.event_date,
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div
                                                    className="w-[180px]"
                                                    data-cell-name="child-event-categories"
                                                  />
                                                  <div
                                                    className="w-[120px]"
                                                    data-cell-name="child-event-actions"
                                                  />
                                                </div>
                                              ))}

                                            {/* Child Event Calcs Row */}
                                            <div
                                              className="hover:bg-content2 last-of-type:border-b-default-300 [&>div]:border-default-300 border-t-success flex flex-1 border-[0.5px] border-x-0 text-xs last-of-type:border-b-[0.5px] [&>div]:flex [&>div]:flex-col [&>div]:justify-center [&>div]:border-[0.5px] [&>div]:border-b-0 [&>div]:p-1"
                                              data-cell-name="child-event-calc-row"
                                            >
                                              <div
                                                className="w-[70px]"
                                                data-cell-name="child-event-calc-checkbox"
                                              />
                                              <div
                                                className="w-[120px] text-right"
                                                data-cell-name="child-event-calc-quantity"
                                              >
                                                {aggregateChildEventsQuantity(
                                                  (eventObj.childEvents as CalendarEvent[]) ||
                                                    [],
                                                ) + eventObj.quantity}
                                              </div>
                                              <div
                                                className="w-[120px] text-right"
                                                data-cell-name="child-event-calc-amount"
                                              />
                                              <div
                                                className="w-[120px] text-right"
                                                data-cell-name="child-event-calc-total-amount"
                                              >
                                                {formatCurrency(
                                                  new Decimal(
                                                    aggregateChildEventsTotalAmount(
                                                      (eventObj.childEvents as CalendarEvent[]) ||
                                                        [],
                                                    ),
                                                  )
                                                    .plus(
                                                      new Decimal(
                                                        eventObj.amount || 0,
                                                      ).times(
                                                        new Decimal(
                                                          eventObj.quantity ||
                                                            0,
                                                        ),
                                                      ),
                                                    )
                                                    .toString(),
                                                )}
                                              </div>
                                              <div
                                                className="w-[90px]"
                                                data-cell-name="child-event-calc-currency"
                                              />
                                              <div
                                                className={clsx(
                                                  "w-[120px] cursor-no-drop text-right",
                                                  eventObj.type === "EXPENSE" &&
                                                    "text-danger",
                                                  eventObj.type === "INCOME" &&
                                                    "text-success",
                                                )}
                                                data-cell-name="child-event-calc-exchange-rate"
                                              >
                                                {formatCurrency(
                                                  aggregateChildEventsExchangeRate(
                                                    (eventObj.childEvents as CalendarEvent[]) ||
                                                      [],
                                                    eventObj,
                                                  ),
                                                )}
                                              </div>
                                              <div
                                                className="w-[90px] !flex-row items-center"
                                                data-cell-name="child-event-calc-structure-type"
                                              />
                                              <div
                                                className="flex w-[210px] !flex-row flex-wrap !justify-start gap-1"
                                                data-cell-name="child-event-calc-description"
                                              />
                                              <div
                                                className="w-[180px]"
                                                data-cell-name="child-event-calc-categories"
                                              />
                                              <div
                                                className="w-[120px]"
                                                data-cell-name="child-event-calc-actions"
                                              >
                                                {/* @TODO allow deleting or changing the date of a child event directly */}
                                              </div>
                                            </div>
                                          </>
                                        )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Day Stats */}
                              <div className="border-default-300 [&>div]:border-b-default-300 w-[120px] border-x-[0.5px] text-right text-xs font-bold [&>div]:border-b-[0.5px] [&>div]:px-1">
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
                    <div className="border-default-300 [&>div]:border-b-default-300 w-[120px] border-r-[0.5px] border-l-[0.5px] text-right text-xs font-bold [&>div]:border-b-[0.5px] [&>div]:px-1">
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
          <div className="border-default-300 [&>div]:border-b-default-300 w-[180px] border-r-[0.5px] border-l-[0.5px] text-right text-xs font-bold [&>div]:px-1 [&>div]:not-[:last-child]:border-b-[0.5px]">
            <span className="text-default-400 mb-1 block text-center">
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
              <Divider className="h-3" orientation="vertical" />
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
              <Divider className="h-3" orientation="vertical" />
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
              <Divider className="h-3" orientation="vertical" />
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
        isMultiple={selectedEventIds.size > 1}
        isOpen={!!selectedEventForDelete}
        isRecurring={!!selectedEventForDelete?.parent_event_id}
        multipleCount={selectedEventIds.size}
        onClose={() => setSelectedEventForDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
};
