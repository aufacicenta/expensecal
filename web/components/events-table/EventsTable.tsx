import {
  EventAttributes,
  InventoryValuationStatus,
} from "@expensecal/database/models/Event";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Alert } from "@heroui/alert";
import { Kbd } from "@heroui/kbd";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import clsx from "clsx";
import { addToast } from "@heroui/toast";
import {
  CalendarFold,
  CalendarSync,
  Circle,
  CircleCheckBig,
  CircleX,
  Command,
  DollarSign,
  FolderPlus,
  Info,
  ListChevronsUpDown,
  Loader2,
  Trash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CommandsModal } from "../commands-modal/CommandsModal";
import { FullPageLoadingState } from "../full-page-loading-state/FullPageLoadingState";

import { EventsTableProps } from "./EventsTable.types";
import { DeleteEventConfirmationModal } from "./delete-event-confirmation-modal/DeleteEventConfirmationModal";
import { EventInfoDrawer } from "./event-info-drawer/EventInfoDrawer";
import { EventsTableHeader } from "./events-table-header/EventsTableHeader";
import { MakeRecurringModal } from "./make-recurring-modal/MakeRecurringModal";
import { CreateViewModal } from "./create-view-modal/CreateViewModal";
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
import { toDateString } from "@/lib/date";
import { formatDayShort, formatMonthShort } from "@/lib/date/formatters";
import { formatCurrency } from "@/lib/currency/formatter";
import { useEventsContext } from "@/context/Events/useEventsContext";
import { useEventCategoriesContext } from "@/context/EventCategories/useEventCategoriesContext";
import { useCurrencyContext } from "@/context/Currency/useCurrencyContext";
import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { useInventoryContext } from "@/context/Inventory/useInventoryContext";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { useEventStatusPolling } from "@/hooks/useEventStatusPolling/useEventStatusPolling";
import {
  CalendarEvent,
  DayStats,
  MonthStats,
} from "@/app/api/v2/calendar/types";
import { DeleteMode } from "@/app/api/v1/events/[id]/types";

// Helper to get color for valuation status chip
const getValuationStatusColor = (
  status: InventoryValuationStatus,
): "success" | "danger" | "warning" | "default" => {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "danger";
    case "IN_PROGRESS":
      return "warning";
    default:
      return "default";
  }
};

// @TODO handle an edge case with EventCellDateEdit where editing a recurring event may need to update all the dates in the series.
export const EventsTable: React.FC<EventsTableProps> = ({ currentView }) => {
  const {
    calendarV2Data,
    filteredCalendarData,
    loadCalendarV2,
    actionStates: calendarV2ActionStates,
  } = useCalendarV2Context();
  const {
    updateEvent,
    updateEventMultiple,
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
    getSelectedEvents,
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
  const [isCreateViewModalOpen, setIsCreateViewModalOpen] = useState(false);
  const [scrollToEventId, setScrollToEventId] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(68); // Default height, will be updated dynamically
  const {
    valuatingEventIds,
    valuateItem,
    valuateMultiple,
    actionStates: inventoryActionStates,
  } = useInventoryContext();
  const router = useRouter();
  const routes = useRoutes();

  // Compute event IDs that need polling (PENDING or IN_PROGRESS valuation status)
  const pendingValuationEventIds = useMemo(() => {
    if (!calendarV2Data) return [];

    const pendingIds: string[] = [];

    // Iterate through all events in the calendar
    Object.values(calendarV2Data.calendar).forEach((yearObj) => {
      Object.values(yearObj).forEach((monthObj) => {
        Object.values(monthObj).forEach((events) => {
          (events as CalendarEvent[]).forEach((event) => {
            const status = event.inventory_metadata?.valuation_status;

            if (status === "PENDING" || status === "IN_PROGRESS") {
              if (event.id) {
                pendingIds.push(event.id);
              }
            }
          });
        });
      });
    });

    return pendingIds;
  }, [calendarV2Data]);

  // Poll for status updates on PENDING/IN_PROGRESS events
  const { fetchEventById } = useEventStatusPolling(pendingValuationEventIds, {
    pollInterval: 5000, // 5 seconds
    enabled: pendingValuationEventIds.length > 0,
  });

  // Handle inventory valuation
  const handleValuateEvent = async (eventId: string) => {
    const result = await valuateItem(eventId);

    if (result.success && result.data?.valuation) {
      addToast({
        title: "Valuation complete",
        description: `Estimated value: $${result.data.valuation.estimated_low || 0} - $${result.data.valuation.estimated_high || 0}`,
        color: "success",
      });
    } else {
      addToast({
        title: "Valuation failed",
        description: result.error || "Unknown error",
        color: "danger",
      });
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

  const handleBulkCategoryUpdate = (categoryIds: string[]) => {
    if (selectedEventIds.size === 0) return;

    const selectedEvents = getSelectedEvents();
    const eventCount = selectedEvents.length;

    // Fire and forget - don't block the UI
    updateEventMultiple({
      updates: selectedEvents.map((event) => ({
        eventId: event.id!,
        data: { categoryIds },
      })),
    })
      .then((response) => {
        if (response.success && response.data) {
          addToast({
            title: `Updated ${response.data.updatedCount} event${response.data.updatedCount > 1 ? "s" : ""}`,
            description: "Categories updated successfully",
            color: "success",
          });

          if (
            response.data.failedUpdates &&
            response.data.failedUpdates.length > 0
          ) {
            addToast({
              title: `Failed to update ${response.data.failedUpdates.length} event${response.data.failedUpdates.length > 1 ? "s" : ""}`,
              description: response.data.failedUpdates
                .map((f) => f.reason)
                .slice(0, 3)
                .join("; "),
              color: "warning",
            });
          }
        }
      })
      .catch((error) => {
        addToast({
          title: `Failed to update ${eventCount} event${eventCount > 1 ? "s" : ""}`,
          description: error instanceof Error ? error.message : "Unknown error",
          color: "danger",
        });
      });

    // Clear selection immediately for non-blocking UX
    clearSelection();
  };

  const handleBulkCurrencyUpdate = (currencyId: string) => {
    if (selectedEventIds.size === 0) return;

    const selectedEvents = getSelectedEvents();
    const eventCount = selectedEvents.length;

    // Fire and forget - don't block the UI
    updateEventMultiple({
      updates: selectedEvents.map((event) => ({
        eventId: event.id!,
        data: { currency_id: currencyId },
      })),
    })
      .then((response) => {
        if (response.success && response.data) {
          addToast({
            title: `Updated ${response.data.updatedCount} event${response.data.updatedCount > 1 ? "s" : ""}`,
            description: "Currency updated successfully",
            color: "success",
          });

          if (
            response.data.failedUpdates &&
            response.data.failedUpdates.length > 0
          ) {
            addToast({
              title: `Failed to update ${response.data.failedUpdates.length} event${response.data.failedUpdates.length > 1 ? "s" : ""}`,
              description: response.data.failedUpdates
                .map((f) => f.reason)
                .slice(0, 3)
                .join("; "),
              color: "warning",
            });
          }
        }
      })
      .catch((error) => {
        addToast({
          title: `Failed to update ${eventCount} event${eventCount > 1 ? "s" : ""}`,
          description: error instanceof Error ? error.message : "Unknown error",
          color: "danger",
        });
      });

    // Clear selection immediately for non-blocking UX
    clearSelection();
  };

  const handleBulkDateUpdate = (newDate: Date) => {
    if (selectedEventIds.size === 0) return;

    const selectedEvents = getSelectedEvents();
    const eventCount = selectedEvents.length;

    // Fire and forget - don't block the UI
    updateEventMultiple({
      updates: selectedEvents.map((event) => ({
        eventId: event.id!,
        data: { event_date: newDate },
      })),
    })
      .then((response) => {
        if (response.success && response.data) {
          addToast({
            title: `Updated ${response.data.updatedCount} event${response.data.updatedCount > 1 ? "s" : ""}`,
            description: "Date updated successfully",
            color: "success",
          });

          if (
            response.data.failedUpdates &&
            response.data.failedUpdates.length > 0
          ) {
            addToast({
              title: `Failed to update ${response.data.failedUpdates.length} event${response.data.failedUpdates.length > 1 ? "s" : ""}`,
              description: response.data.failedUpdates
                .map((f) => f.reason)
                .slice(0, 3)
                .join("; "),
              color: "warning",
            });
          }
        }
      })
      .catch((error) => {
        addToast({
          title: `Failed to update ${eventCount} event${eventCount > 1 ? "s" : ""}`,
          description: error instanceof Error ? error.message : "Unknown error",
          color: "danger",
        });
      });

    // Clear selection immediately for non-blocking UX
    clearSelection();
  };

  const handleBulkValuate = async () => {
    if (selectedEventIds.size === 0) return;
    if (selectedEventIds.size > 10) {
      addToast({
        title: "Too many items selected",
        description: "Maximum 10 items can be valuated at once",
        color: "warning",
      });

      return;
    }

    const eventIds = Array.from(selectedEventIds);
    const result = await valuateMultiple(eventIds);

    if (result.success && result.data) {
      const successCount = result.data.results.filter((r) => r.success).length;
      const failedCount = result.data.results.filter((r) => !r.success).length;

      if (successCount > 0) {
        addToast({
          title: `Valuated ${successCount} item${successCount > 1 ? "s" : ""}`,
          description: "Valuation complete",
          color: "success",
        });
      }

      if (failedCount > 0) {
        addToast({
          title: `Failed to valuate ${failedCount} item${failedCount > 1 ? "s" : ""}`,
          description: "Some items could not be valuated",
          color: "warning",
        });
      }

      // Clear selection after successful valuation
      clearSelection();
    } else {
      addToast({
        title: "Valuation failed",
        description: result.error || "Unknown error",
        color: "danger",
      });
    }
  };

  const handleCreateViewSuccess = (viewId: string) => {
    clearSelection();
    // Optionally navigate to the new view
    router.push(routes.table.view(viewId));
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

  useEffect(() => {
    if (!!calendarV2Data) return;

    // Load calendar data on mount
    loadCalendarV2();
  }, []);

  // Scroll to the first created event after calendar data re-renders
  useEffect(() => {
    if (!scrollToEventId || !calendarV2Data) return;

    // Use requestAnimationFrame to ensure the DOM has rendered the new events
    const rafId = requestAnimationFrame(() => {
      const element = document.getElementById(`event-${scrollToEventId}`);

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Brief highlight effect
        element.classList.add("bg-primary/10");
        setTimeout(() => {
          element.classList.remove("bg-primary/10");
        }, 2000);
      }

      setScrollToEventId(null);
    });

    return () => cancelAnimationFrame(rafId);
  }, [scrollToEventId, calendarV2Data]);

  const handleEventsCreated = useCallback((firstEventId: string) => {
    setScrollToEventId(firstEventId);
  }, []);

  const handleScrollToToday = useCallback(() => {
    const today = toDateString(new Date());
    const allDateElements =
      document.querySelectorAll<HTMLElement>("[data-date]");

    if (allDateElements.length === 0) return;

    let closestElement: HTMLElement | null = null;
    let closestDiff = Infinity;

    allDateElements.forEach((el) => {
      const dateStr = el.dataset.date;

      if (!dateStr) return;

      // For exact match, use it immediately
      if (dateStr === today) {
        closestElement = el;
        closestDiff = 0;

        return;
      }

      const diff = Math.abs(
        new Date(dateStr).getTime() - new Date(today).getTime(),
      );

      if (diff < closestDiff) {
        closestDiff = diff;
        closestElement = el;
      }
    });

    if (closestElement) {
      (closestElement as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Brief highlight effect
      (closestElement as HTMLElement).classList.add("bg-primary/10");
      setTimeout(() => {
        (closestElement as HTMLElement)?.classList.remove("bg-primary/10");
      }, 2000);
    }
  }, []);

  if (!calendarV2Data) return <FullPageLoadingState />;

  return (
    <section
      className="relative w-fit overflow-x-auto"
      style={{ paddingTop: headerHeight }}
    >
      {/* Loading State Over Existing Calendar - shows during full reload */}
      {calendarV2ActionStates.loadCalendarV2.isLoading && (
        <FullPageLoadingState />
      )}

      {/* Fixed Table Nav */}
      <EventsTableHeader
        categories={categories}
        currencies={currencies}
        currentView={currentView}
        isBulkValuating={inventoryActionStates.valuateMultiple.isLoading}
        selectedCategoryIds={selectedCategoryIds}
        selectedCount={selectedEventIds.size}
        selectedEventIds={selectedEventIds}
        showOriginalText={showOriginalText}
        totalCount={getAllEventIds().length}
        onBulkCategoryUpdate={handleBulkCategoryUpdate}
        onBulkCurrencyUpdate={handleBulkCurrencyUpdate}
        onBulkDateUpdate={handleBulkDateUpdate}
        onBulkValuate={handleBulkValuate}
        onCategoryFilterChange={setSelectedCategoryIds}
        onCreateViewClick={() => setIsCreateViewModalOpen(true)}
        onHeightChange={setHeaderHeight}
        onScrollToToday={handleScrollToToday}
        onToggleAll={handleToggleAllSelection}
        onToggleTextMode={() => setShowOriginalText(!showOriginalText)}
      />

      {/* Empty State */}
      {Object.keys(filteredCalendarData?.calendar || {}).length === 0 && (
        <div className="flex h-[350px] w-screen flex-col items-center justify-center">
          <Alert
            hideIcon
            className="max-w-xl"
            classNames={{ base: "flex-grow-0" }}
            description="Add your first expense or income to get started"
            endContent={
              <Button
                color="primary"
                size="sm"
                onPress={() => setIsCommandsModalOpen(true)}
              >
                Quick Commands
              </Button>
            }
            title="No Events Yet"
            variant="faded"
          >
            <p className="text-default text-xs">
              or press <Kbd keys={["command"]}>K</Kbd> on Mac /{" "}
              <Kbd keys={["ctrl"]}>K</Kbd> on Windows
            </p>
          </Alert>
        </div>
      )}

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
                                data-date={`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`}
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
                                        id={`event-${eventObj.id}`}
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
                                            className="flex w-[210px] flex-col gap-1"
                                            data-cell-name="event-description"
                                          >
                                            <span>
                                              {showOriginalText &&
                                              eventObj.original_text
                                                ? eventObj.original_text
                                                : eventObj.description}
                                            </span>
                                            {/* Valuation status for inventory items */}
                                            {eventObj.inventory_metadata
                                              ?.valuation_status && (
                                              <Chip
                                                classNames={{
                                                  content: "text-xs",
                                                }}
                                                color={getValuationStatusColor(
                                                  eventObj.inventory_metadata
                                                    .valuation_status,
                                                )}
                                                size="sm"
                                                variant="flat"
                                              >
                                                {eventObj.inventory_metadata
                                                  .valuation_status ===
                                                "COMPLETED"
                                                  ? `$${eventObj.inventory_metadata.valuation?.estimated_low ?? 0} - $${eventObj.inventory_metadata.valuation?.estimated_high ?? 0}`
                                                  : eventObj.inventory_metadata
                                                      .valuation_status}
                                              </Chip>
                                            )}
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
                                              {/* Valuate action for inventory items */}
                                              {eventObj.inventory_metadata &&
                                                (eventObj.inventory_metadata
                                                  .valuation_status ===
                                                  "PENDING" ||
                                                  eventObj.inventory_metadata
                                                    .valuation_status ===
                                                    "FAILED" ||
                                                  !eventObj.inventory_metadata
                                                    .valuation_status) && (
                                                  <div
                                                    role="button"
                                                    tabIndex={0}
                                                    title="Get market valuation"
                                                    onClick={() =>
                                                      handleValuateEvent(
                                                        eventObj.id || "",
                                                      )
                                                    }
                                                    onKeyDown={(e) => {
                                                      if (
                                                        e.key === "Enter" ||
                                                        e.key === " "
                                                      ) {
                                                        e.preventDefault();
                                                        handleValuateEvent(
                                                          eventObj.id || "",
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    {valuatingEventIds.has(
                                                      eventObj.id || "",
                                                    ) ? (
                                                      <Loader2
                                                        className="stroke-warning animate-spin"
                                                        size={16}
                                                      />
                                                    ) : (
                                                      <DollarSign
                                                        className="stroke-default-400 hover:stroke-success cursor-pointer"
                                                        size={16}
                                                      />
                                                    )}
                                                  </div>
                                                )}
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

      {/* Create View Modal */}
      <CreateViewModal
        isOpen={isCreateViewModalOpen}
        selectedEventIds={Array.from(selectedEventIds)}
        onClose={() => setIsCreateViewModalOpen(false)}
        onSuccess={handleCreateViewSuccess}
      />

      {/* Event Info Drawer */}
      <EventInfoDrawer
        calendarV2Data={calendarV2Data}
        event={selectedEventForInfo}
        isOpen={!!selectedEventForInfo}
        onClose={() => setSelectedEventForInfo(null)}
        onRefreshEvent={fetchEventById}
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

      {/* Floating Action Buttons */}
      <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-3">
        {/* Create View Button - only visible when events are selected */}
        {selectedEventIds.size > 0 && (
          <Button
            isIconOnly
            className="shadow-lg"
            color="secondary"
            radius="full"
            size="lg"
            title={`Create view from ${selectedEventIds.size} selected event${selectedEventIds.size !== 1 ? "s" : ""}`}
            onPress={() => setIsCreateViewModalOpen(true)}
          >
            <FolderPlus size={24} />
          </Button>
        )}

        {/* Commands Button */}
        <Button
          isIconOnly
          className="shadow-lg"
          color="primary"
          radius="full"
          size="lg"
          onPress={() => setIsCommandsModalOpen(true)}
        >
          <Command size={24} />
        </Button>
      </div>

      {/* Commands Modal */}
      <CommandsModal
        eventGroupId={currentView?.id}
        isOpen={isCommandsModalOpen}
        onEventsCreated={handleEventsCreated}
        onOpenChange={setIsCommandsModalOpen}
      />
    </section>
  );
};
