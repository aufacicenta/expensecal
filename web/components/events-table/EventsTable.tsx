import { EventAttributes } from "@expensecal/database/models/Event";
import { Button } from "@heroui/button";
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
import {
  CalendarFold,
  CalendarSync,
  Circle,
  CircleCheckBig,
  CircleX,
  Command,
  Info,
  ListChevronsUpDown,
  Loader2,
  Trash,
} from "lucide-react";
import { useEffect, useState } from "react";

import { CommandsModal } from "../commands-modal/CommandsModal";
import { StaggerLoadingAnimation } from "../stagger-loading-animation/StaggerLoadingAnimation";

import { EventsTableProps } from "./EventsTable.types";
import { DeleteEventConfirmationModal } from "./delete-event-confirmation-modal/DeleteEventConfirmationModal";
import { EventInfoDrawer } from "./event-info-drawer/EventInfoDrawer";
import { EventsTableHeader } from "./events-table-header/EventsTableHeader";
import { MakeRecurringModal } from "./make-recurring-modal/MakeRecurringModal";
import { ChildEventsPanel } from "./child-events-panel/ChildEventsPanel";
import { StatsCell } from "./stats-cell/StatsCell";
import { StatsDetailsDrawer } from "./stats-cell/StatsDetailsDrawer";
import {
  StatsDetailsPeriod,
  StatsDetailsType,
} from "./stats-cell/StatsDetailsDrawer.types";
import { StatsCellVariant } from "./stats-cell/StatsCell.types";
import { useEventSelection } from "./hooks/useEventSelection";
import { useEventEditState } from "./hooks/useEventEditState";
import { MakeRecurringParams } from "./make-recurring-modal/MakeRecurringModal.types";
import { EventCellAmountEdit } from "./event-cell-amount-edit/EventCellAmountEdit";
import { EventCellCategoriesSelect } from "./event-cell-categories-select/EventCellCategoriesSelect";
import { EventCellCurrencyEdit } from "./event-cell-currency-edit/EventCellCurrencyEdit";
import { EventCellDateEdit } from "./event-cell-date-edit/EventCellDateEdit";
import { EventCellQuantityEdit } from "./event-cell-quantity-edit/EventCellQuantityEdit";

import { getStructureType } from "@/lib/events/getStructureType";
import { formatDayShort, formatMonthShort } from "@/lib/date/formatters";
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
  const { calendarV2Data, filteredCalendarData, loadCalendarV2 } =
    useCalendarV2Context();
  const {
    updateEvent,
    deleteEvent,
    actionStates: eventsContextActionStates,
    deleteEventMultiple,
    makeEventRecurring,
  } = useEventsContext();
  const { categories, selectedCategoryIds, setSelectedCategoryIds } =
    useEventCategoriesContext();
  const { currencies } = useCurrencyContext();
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [selectedEventForQuantity, setSelectedEventForQuantity] =
    useState<CalendarEvent | null>(null);
  const [selectedEventForAmount, setSelectedEventForAmount] =
    useState<CalendarEvent | null>(null);
  const [selectedEventForDelete, setSelectedEventForDelete] =
    useState<CalendarEvent | null>(null);
  const [selectedEventForInfo, setSelectedEventForInfo] =
    useState<CalendarEvent | null>(null);
  const [selectedEventForRecurring, setSelectedEventForRecurring] =
    useState<CalendarEvent | null>(null);
  const [statsDetailsDrawer, setStatsDetailsDrawer] = useState<{
    isOpen: boolean;
    variant: StatsCellVariant;
    period: StatsDetailsPeriod;
    type: StatsDetailsType;
  } | null>(null);
  const {
    selectedEventIds,
    getAllEventIds,
    handleToggleEventSelection,
    handleToggleDaySelection,
    handleToggleMonthSelection,
    handleToggleYearSelection,
    handleToggleAllSelection,
    clearSelection,
  } = useEventSelection({ calendarV2Data });
  const {
    dirtyEventIds,
    markEventAsDirty,
    clearEventDirty,
    isAnyFieldLoading,
    handleLoadingChange,
    registerAmountEditRef,
    registerQuantityEditRef,
    handleSaveAllDirtyFields,
  } = useEventEditState();
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    new Set(),
  );
  const [isCommandsModalOpen, setIsCommandsModalOpen] = useState(false);

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

  const handleConfirmMakeRecurring = async (params: MakeRecurringParams) => {
    if (!selectedEventForRecurring?.id) return;

    try {
      await makeEventRecurring(selectedEventForRecurring.id, {
        frequency: params.frequency,
        interval: params.interval,
        count: params.count,
        split_amount: params.splitAmount,
      });
      setSelectedEventForRecurring(null);
    } catch (error) {
      console.error("Failed to make event recurring:", error);
    }
  };

  const handleBulkDelete = async (deleteMode: DeleteMode = "single") => {
    if (selectedEventIds.size === 0) return;

    try {
      await deleteEventMultiple(Array.from(selectedEventIds), deleteMode);
      clearSelection();
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
      <EventsTableHeader
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        selectedCount={selectedEventIds.size}
        showOriginalText={showOriginalText}
        totalCount={getAllEventIds().length}
        onCategoryFilterChange={setSelectedCategoryIds}
        onToggleAll={handleToggleAllSelection}
        onToggleTextMode={() => setShowOriginalText(!showOriginalText)}
      />

      {Object.entries(filteredCalendarData?.calendar || {}).map(
        ([year, yearObj]) => (
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
                    <div
                      key={`${year}-${month}`}
                      className="border-default-300"
                    >
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
                            .sort(
                              ([dayA], [dayB]) => Number(dayA) - Number(dayB),
                            )
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
                                      {formatDayShort(
                                        `${year}-${month}-${day}`,
                                      )}
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
                                                  handleLoadingChange(
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
                                              setSelectedEventForAmount(
                                                eventObj,
                                              );
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
                                                  setSelectedEventForAmount(
                                                    null,
                                                  );
                                                }}
                                                onLoadingChange={(isLoading) =>
                                                  handleLoadingChange(
                                                    eventObj.id || "",
                                                    isLoading,
                                                  )
                                                }
                                                onUpdate={
                                                  handleEventAmountUpdate
                                                }
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
                                              <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => {
                                                  setSelectedEventForInfo(
                                                    eventObj,
                                                  );
                                                }}
                                                onKeyDown={(e) => {
                                                  if (
                                                    e.key === "Enter" ||
                                                    e.key === " "
                                                  ) {
                                                    e.preventDefault();
                                                    setSelectedEventForInfo(
                                                      eventObj,
                                                    );
                                                  }
                                                }}
                                              >
                                                <Info
                                                  className="stroke-default-400 hover:stroke-primary cursor-pointer"
                                                  size={16}
                                                />
                                              </div>
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
                                              {/* Make a single event recurring or in installments */}
                                              {getStructureType(eventObj) ===
                                                "single" && (
                                                <div
                                                  role="button"
                                                  tabIndex={0}
                                                  title="Make recurring"
                                                  onClick={() =>
                                                    setSelectedEventForRecurring(
                                                      eventObj,
                                                    )
                                                  }
                                                  onKeyDown={(e) => {
                                                    if (
                                                      e.key === "Enter" ||
                                                      e.key === " "
                                                    ) {
                                                      e.preventDefault();
                                                      setSelectedEventForRecurring(
                                                        eventObj,
                                                      );
                                                    }
                                                  }}
                                                >
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
                                                      selectedEventIds.size >
                                                        0 &&
                                                      selectedEventIds.has(
                                                        eventObj.id || "",
                                                      )
                                                    ) {
                                                      // Delete only if this event is part of the selected set
                                                      handleEventDelete(
                                                        eventObj,
                                                      );
                                                    } else if (
                                                      selectedEventIds.size ===
                                                      0
                                                    ) {
                                                      // Single delete when no events are selected
                                                      handleEventDelete(
                                                        eventObj,
                                                      );
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
                                            <ChildEventsPanel
                                              childEvents={
                                                eventObj.childEvents as CalendarEvent[]
                                              }
                                              parentEvent={eventObj}
                                            />
                                          )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Day Stats */}
                                <StatsCell
                                  stats={
                                    (
                                      filteredCalendarData?.stats[year]?.[
                                        month
                                      ] as MonthStats
                                    )?.[day] as DayStats
                                  }
                                  variant="day"
                                  onExpenseClick={() =>
                                    setStatsDetailsDrawer({
                                      isOpen: true,
                                      variant: "day",
                                      period: { year, month, day },
                                      type: "expense",
                                    })
                                  }
                                  onIncomeClick={() =>
                                    setStatsDetailsDrawer({
                                      isOpen: true,
                                      variant: "day",
                                      period: { year, month, day },
                                      type: "income",
                                    })
                                  }
                                />
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Month Stats */}
                      <StatsCell
                        stats={
                          (
                            filteredCalendarData?.stats[year]?.[
                              month
                            ] as MonthStats
                          )?.stats
                        }
                        variant="month"
                        onExpenseClick={() =>
                          setStatsDetailsDrawer({
                            isOpen: true,
                            variant: "month",
                            period: { year, month },
                            type: "expense",
                          })
                        }
                        onIncomeClick={() =>
                          setStatsDetailsDrawer({
                            isOpen: true,
                            variant: "month",
                            period: { year, month },
                            type: "income",
                          })
                        }
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* Year Stats */}
            <StatsCell
              label={<>{year} Income - Expenses</>}
              stats={
                filteredCalendarData?.stats[year]?.stats || {
                  totalIncome: "0",
                  totalExpenses: "0",
                  net: "0",
                }
              }
              variant="year"
              onExpenseClick={() =>
                setStatsDetailsDrawer({
                  isOpen: true,
                  variant: "year",
                  period: { year },
                  type: "expense",
                })
              }
              onIncomeClick={() =>
                setStatsDetailsDrawer({
                  isOpen: true,
                  variant: "year",
                  period: { year },
                  type: "income",
                })
              }
            />
          </div>
        ),
      )}
      <DeleteEventConfirmationModal
        isMultiple={selectedEventIds.size > 1}
        isOpen={!!selectedEventForDelete}
        isRecurring={!!selectedEventForDelete?.parent_event_id}
        multipleCount={selectedEventIds.size}
        onClose={() => setSelectedEventForDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Make Recurring Modal */}
      <MakeRecurringModal
        event={selectedEventForRecurring}
        isLoading={eventsContextActionStates.makeEventRecurring.isLoading}
        isOpen={!!selectedEventForRecurring}
        onClose={() => setSelectedEventForRecurring(null)}
        onConfirm={handleConfirmMakeRecurring}
      />

      {/* Event Info Drawer */}
      <EventInfoDrawer
        calendarV2Data={calendarV2Data}
        event={selectedEventForInfo}
        isOpen={!!selectedEventForInfo}
        onClose={() => setSelectedEventForInfo(null)}
      />

      {/* Stats Details Drawer */}
      {statsDetailsDrawer && (
        <StatsDetailsDrawer
          calendarV2Data={calendarV2Data}
          isOpen={statsDetailsDrawer.isOpen}
          period={statsDetailsDrawer.period}
          type={statsDetailsDrawer.type}
          variant={statsDetailsDrawer.variant}
          onClose={() => setStatsDetailsDrawer(null)}
        />
      )}

      {/* Floating Commands Button */}
      <Button
        isIconOnly
        className="fixed right-6 bottom-6 z-50 shadow-lg"
        color="primary"
        radius="full"
        size="lg"
        onPress={() => setIsCommandsModalOpen(true)}
      >
        <Command size={24} />
      </Button>

      {/* Commands Modal */}
      <CommandsModal
        isOpen={isCommandsModalOpen}
        onOpenChange={setIsCommandsModalOpen}
      />
    </section>
  );
};
