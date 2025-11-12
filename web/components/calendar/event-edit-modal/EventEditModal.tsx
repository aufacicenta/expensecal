"use client";

import { CalendarEventData } from "@/app/api/v1/calendar/types";
import { useCurrencyContext } from "@/context/Currency/useCurrencyContext";
import { useEventEditModalContext } from "@/context/EventEditModal/EventEditModalContext";
import { useEventsContext } from "@/context/Events/useEventsContext";
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
import { AlertCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  EditableEventField,
  EventEditModalProps,
} from "./EventEditModal.types";

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

  // Helper function to convert Date to YYYY-MM-DD format
  const formatDateToString = (date: Date): string => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    amount: event.amount,
    quantity: event.quantity,
    currency_id: event.currency_id,
    description: event.description,
    event_date: formatDateToString(event.event_date), // YYYY-MM-DD format
  });
  const [childEvents, setChildEvents] = useState<CalendarEventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch child events if this is a recurring event
  useEffect(() => {
    const loadChildEvents = async () => {
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

    loadChildEvents();
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
      };

      await updateEvent(event.id!, updatePayload);
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
      event_date: formatDateToString(event.event_date),
    });
    setHasChanges(false);
    setEditingField(null);
    setError(null);
  };

  const handleDelete = async (deleteMode: "single" | "all-future") => {
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

  const handleOpenChildEvent = (
    childEvent: CalendarEventData,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    openModal(childEvent, modalId);
  };

  // Format date for display
  const displayDate = new Date(event.event_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="lg">
      <ModalContent>
        {(onCloseInternal) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Edit Event
            </ModalHeader>

            <ModalBody>
              {/* Error display */}
              {error && (
                <div className="border-danger bg-danger/10 text-danger flex items-start gap-2 rounded border p-2 text-xs">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
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
                        type="number"
                        label="Amount"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) =>
                          handleFieldChange("amount", e.target.value)
                        }
                        step="0.01"
                        className="flex-1"
                      />
                      <Select
                        label="Currency"
                        placeholder="Select currency"
                        selectedKeys={[formData.currency_id]}
                        onChange={(e) =>
                          handleFieldChange("currency_id", e.target.value)
                        }
                        className="flex-1"
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
                        type="number"
                        label="Quantity"
                        placeholder="1"
                        value={String(formData.quantity)}
                        onChange={(e) =>
                          handleFieldChange(
                            "quantity",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        min="1"
                        className="flex-1"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingField("amount")}
                    disabled={loading}
                    className="hover:bg-content2 block w-full rounded p-2 text-left disabled:opacity-50"
                  >
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
                      {event.quantity > 1 && ` × ${event.quantity}`}
                    </div>
                  </button>
                )}

                {/* Description */}
                {editingField === "description" ? (
                  <Textarea
                    label="Description"
                    placeholder="Event description"
                    value={formData.description}
                    onChange={(e) =>
                      handleFieldChange("description", e.target.value)
                    }
                    minRows={2}
                    maxRows={4}
                    description={event.original_text}
                  />
                ) : (
                  <button
                    onClick={() => setEditingField("description")}
                    disabled={loading}
                    className="hover:bg-content2 block w-full rounded p-2 text-left disabled:opacity-50"
                  >
                    <div className="text-content4 text-xs">Description</div>
                    <div className="font-medium">{event.description}</div>
                    <div className="text-content4 mt-2 text-xs">
                      {event.original_text}
                    </div>
                  </button>
                )}

                {/* Date */}
                {editingField === "date" ? (
                  <Input
                    type="date"
                    label="Date"
                    value={formData.event_date}
                    onChange={(e) =>
                      handleFieldChange("event_date", e.target.value)
                    }
                  />
                ) : (
                  <button
                    onClick={() => setEditingField("date")}
                    disabled={loading}
                    className="hover:bg-content2 block w-full rounded p-2 text-left disabled:opacity-50"
                  >
                    <div className="text-content4 text-xs">Date</div>
                    <div className="font-medium">{displayDate}</div>
                  </button>
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
                        <button
                          key={childEvent.id}
                          onClick={(e) => handleOpenChildEvent(childEvent, e)}
                          disabled={loading}
                          className="bg-content2 hover:bg-content3 block w-full rounded p-2 text-left text-xs disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {new Date(
                                childEvent.event_date,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
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
                        </button>
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
                        size="sm"
                        color="primary"
                        onPress={handleSave}
                        isLoading={loading}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="bordered"
                        onPress={handleDiscard}
                        disabled={loading}
                        className="flex-1"
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
                      size="sm"
                      color="danger"
                      variant="bordered"
                      startContent={<Trash2 size={14} />}
                      isLoading={loading}
                      disabled={hasChanges}
                    >
                      Delete
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem
                      key="single"
                      onPress={() => handleDelete("single")}
                      className="text-danger"
                    >
                      Delete this event only
                    </DropdownItem>
                    {childEvents.length > 0 ? (
                      <DropdownItem
                        key="all-future"
                        onPress={() => handleDelete("all-future")}
                        className="text-danger"
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
