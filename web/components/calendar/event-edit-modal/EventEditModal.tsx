"use client";

import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Input, Textarea } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import clsx from "clsx";
import { AlertCircle, Info, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { EventCategories } from "../event-categories/EventCategories";

import {
  EditableEventField,
  EventEditModalProps,
} from "./EventEditModal.types";

import {
  formatDateForDisplay,
  formatDateShort,
  toDateString,
} from "@/lib/date";
import { useEventsContext } from "@/context/Events/useEventsContext";
import { useEventEditModalContext } from "@/context/EventEditModal/EventEditModalContext";
import { useCurrencyContext } from "@/context/Currency/useCurrencyContext";
import { DeleteMode } from "@/app/api/v1/events/[id]/types";
import { CalendarEventData } from "@/app/api/v1/calendar/types";

export const EventEditModal: React.FC<EventEditModalProps> = ({
  modalId,
  event,
  isOpen,
  onClose,
}) => {
  const { openModal } = useEventEditModalContext();
  const { deleteEvent, updateEvent, fetchChildEvents } = useEventsContext();
  const { currencies } = useCurrencyContext();

  const [editingField, setEditingField] = useState<EditableEventField | null>(
    null,
  );

  const [formData, setFormData] = useState({
    amount: event.amount,
    quantity: event.quantity,
    currency_id: event.currency_id,
    description: event.description,
    event_date: toDateString(event.event_date), // YYYY-MM-DD format
    categoryIds: [] as string[],
  });
  const [childEvents, setChildEvents] = useState<CalendarEventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch child events and event categories if this is a recurring event
  useEffect(() => {
    const loadEventData = async () => {
      if (event.parent_event_id || event.recurrence_rule) {
        try {
          const data = await fetchChildEvents(event.id!);

          if (data.success) {
            setChildEvents(data.data);
          }
        } catch (err) {
          console.error("Failed to fetch child events:", err);
        }
      }
    };

    loadEventData();
  }, [event, fetchChildEvents]);

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
    setError(null);
  };

  const currentCurrency = currencies.find((c) => c.id === formData.currency_id);

  const handleSave = async () => {
    if (!hasChanges) {
      setEditingField(null);

      return;
    }

    setLoading(true);
    try {
      // Parse amount as string to maintain precision
      const updatePayload = {
        amount: String(formData.amount),
        quantity: parseInt(String(formData.quantity)),
        currency_id: formData.currency_id,
        description: formData.description,
        event_date: new Date(`${formData.event_date}T00:00:00Z`),
        categoryIds: formData.categoryIds,
      };

      // Pass the original event date to help the context refresh both old and new cells
      // This avoids the need for an extra GET request in the context
      const originalEventDate = new Date(event.event_date);

      await updateEvent(event.id!, updatePayload, originalEventDate);
      setHasChanges(false);
      setEditingField(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    setFormData({
      amount: event.amount,
      quantity: event.quantity,
      currency_id: event.currency_id,
      description: event.description,
      event_date: toDateString(event.event_date),
      categoryIds: [],
    });
    setHasChanges(false);
    setEditingField(null);
    setError(null);
  };

  const handleDelete = async (deleteMode: DeleteMode) => {
    if (
      !confirm(
        `Are you sure you want to delete this event${deleteMode === "all-future" ? " and all future occurrences" : ""}?`,
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await deleteEvent(event.id!, deleteMode);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChildEvent = (childEvent: CalendarEventData) => {
    openModal(childEvent, modalId);
  };

  // Format date for display (using UTC)
  const displayDate = formatDateForDisplay(event.event_date);

  return (
    <Modal isOpen={isOpen} size="lg" onOpenChange={onClose}>
      <ModalContent>
        {(_onCloseInternal) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Edit Event
            </ModalHeader>

            <ModalBody>
              {/* Error display */}
              {error && (
                <div className="border-danger bg-danger/10 text-danger flex items-start gap-2 rounded border p-2 text-xs">
                  <AlertCircle className="mt-0.5 flex-shrink-0" size={14} />
                  <div>{error}</div>
                </div>
              )}

              {/* Event details as text/editable fields */}
              <div className="space-y-3 text-sm">
                {/* Amount and Currency row */}
                {editingField === "amount" ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        className="flex-1"
                        label="Amount"
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={formData.amount}
                        onChange={(e) =>
                          handleFieldChange("amount", e.target.value)
                        }
                      />
                      <Select
                        className="flex-1"
                        label="Currency"
                        placeholder="Select currency"
                        selectedKeys={[formData.currency_id]}
                        onChange={(e) =>
                          handleFieldChange("currency_id", e.target.value)
                        }
                      >
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id}>
                            {currency.symbol} - {currency.name}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        className="flex-1"
                        label="Quantity"
                        min="1"
                        placeholder="1"
                        type="number"
                        value={String(formData.quantity)}
                        onChange={(e) =>
                          handleFieldChange(
                            "quantity",
                            parseInt(e.target.value) || 1,
                          )
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <Button
                    className="hover:bg-content2 block h-auto w-full justify-start rounded p-2 text-left"
                    isDisabled={loading}
                    variant="light"
                    onPress={() => setEditingField("amount")}
                  >
                    <div className="flex flex-col items-start">
                      <div className="text-content4 text-xs">
                        Amount & Currency
                      </div>
                      <div
                        className={clsx(
                          "font-medium",
                          event.type === "EXPENSE"
                            ? "text-danger"
                            : "text-success",
                        )}
                      >
                        {event.quantity}x {currentCurrency?.symbol}{" "}
                        {Number(event.amount).toFixed(
                          currentCurrency?.decimal_units || 2,
                        )}
                      </div>
                    </div>
                  </Button>
                )}

                {/* Description */}
                {editingField === "description" ? (
                  <Textarea
                    description={event.original_text}
                    label="Description"
                    maxRows={4}
                    minRows={2}
                    placeholder="Event description"
                    value={formData.description}
                    onChange={(e) =>
                      handleFieldChange("description", e.target.value)
                    }
                  />
                ) : (
                  <Button
                    className="hover:bg-content2 block h-auto w-full justify-start rounded p-2 text-left"
                    isDisabled={loading}
                    variant="light"
                    onPress={() => setEditingField("description")}
                  >
                    <div className="flex flex-col items-start">
                      <div className="text-content4 text-xs">Description</div>
                      <div className="font-medium">{event.description}</div>
                      <div className="text-content4 mt-2 text-xs">
                        {event.original_text}
                      </div>
                    </div>
                  </Button>
                )}

                {/* Date */}
                {editingField === "date" ? (
                  <Input
                    label="Date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) =>
                      handleFieldChange("event_date", e.target.value)
                    }
                  />
                ) : (
                  <Button
                    className="hover:bg-content2 block h-auto w-full justify-start rounded p-2 text-left"
                    isDisabled={loading}
                    variant="light"
                    onPress={() => setEditingField("date")}
                  >
                    <div className="flex flex-col items-start">
                      <div className="text-content4 text-xs">Date</div>
                      <div className="font-medium">{displayDate}</div>
                    </div>
                  </Button>
                )}

                {/* Categories */}
                {editingField === "categories" ? (
                  <div className="space-y-2">
                    <div className="text-content4 text-xs">Categories</div>
                    {(event.parent_event_id || event.recurrence_rule) && (
                      <div className="text-xxs text-foreground flex items-center gap-1">
                        <Info size={10} />
                        <span>
                          Categories will be applied to all occurrences in this
                          recurring event series
                        </span>
                      </div>
                    )}
                    <EventCategories
                      className="w-full"
                      selectedIds={formData.categoryIds}
                      onSelectionChange={(ids) =>
                        handleFieldChange("categoryIds", ids)
                      }
                    />
                  </div>
                ) : (
                  <Button
                    className="hover:bg-content2 block h-auto w-full justify-start rounded p-2 text-left"
                    isDisabled={loading}
                    variant="light"
                    onPress={() => setEditingField("categories")}
                  >
                    <div className="flex flex-col items-start">
                      <div className="text-content4 text-xs">
                        Categories
                        {(event.parent_event_id || event.recurrence_rule) && (
                          <span className="text-info ml-1 text-xs">
                            (all occurrences)
                          </span>
                        )}
                      </div>
                      <div className="font-medium">
                        {formData.categoryIds.length > 0
                          ? `${formData.categoryIds.length} selected`
                          : "No categories"}
                      </div>
                    </div>
                  </Button>
                )}
              </div>

              {/* Child events if recurring */}
              {childEvents.length > 0 && (
                <>
                  <Divider className="my-3" />
                  <div>
                    <div className="text-content4 mb-2 text-xs font-semibold">
                      Future Occurrences ({childEvents.length})
                    </div>
                    <div className="max-h-32 space-y-1 overflow-y-auto">
                      {childEvents.map((childEvent) => (
                        <Button
                          key={childEvent.id}
                          className="bg-content2 hover:bg-content3 block h-auto w-full justify-start rounded p-2 text-left text-xs"
                          isDisabled={loading}
                          variant="light"
                          onPress={() => handleOpenChildEvent(childEvent)}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="font-medium">
                              {formatDateShort(childEvent.event_date)}
                            </span>
                            <span
                              className={clsx(
                                "text-xxs font-semibold",
                                childEvent.type === "EXPENSE"
                                  ? "text-danger"
                                  : "text-success",
                              )}
                            >
                              {childEvent.type === "EXPENSE" ? "-" : "+"}{" "}
                              {childEvent.currency?.symbol}{" "}
                              {Number(childEvent.amount).toFixed(
                                childEvent.currency?.decimal_units || 2,
                              )}
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </ModalBody>

            {/* Action buttons footer */}
            <ModalFooter>
              <div className="flex w-full gap-2">
                <div className="flex flex-1 gap-2">
                  {hasChanges && (
                    <>
                      <Button
                        className="flex-1"
                        color="primary"
                        isLoading={loading}
                        size="sm"
                        onPress={handleSave}
                      >
                        Save
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={loading}
                        size="sm"
                        variant="bordered"
                        onPress={handleDiscard}
                      >
                        Discard
                      </Button>
                    </>
                  )}
                </div>

                {/* Delete options */}
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      color="danger"
                      disabled={hasChanges}
                      isLoading={loading}
                      size="sm"
                      startContent={<Trash2 size={14} />}
                      variant="bordered"
                    >
                      Delete
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem
                      key="single"
                      className="text-danger"
                      onPress={() => handleDelete("single")}
                    >
                      Delete this event only
                    </DropdownItem>
                    {childEvents.length > 0 ? (
                      <DropdownItem
                        key="all-future"
                        className="text-danger"
                        onPress={() => handleDelete("all-future")}
                      >
                        Delete this and all future occurrences
                      </DropdownItem>
                    ) : null}
                  </DropdownMenu>
                </Dropdown>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
