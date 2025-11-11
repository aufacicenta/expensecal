"use client";

import { useDraggable } from "@dnd-kit/core";
import { Divider } from "@heroui/divider";
import clsx from "clsx";
import { Grip, X } from "lucide-react";
import { DayModalProps } from "./DayModal.types";

export const DayModal: React.FC<DayModalProps> = ({
  day,
  position = { x: 0, y: 0 },
  onClose,
  className,
}) => {
  const modalId = `day-modal-${day.date}`;

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: modalId,
  });

  const style = {
    transform: `translate3d(${(position.x || 0) + (transform?.x || 0)}px, ${(position.y || 0) + (transform?.y || 0)}px, 0)`,
  };

  // Format date for display (e.g., "November 11, 2025")
  // Parse date as local date to avoid timezone offset issues
  const [year, month, date] = day.date.split("-").map(Number);
  const displayDate = new Date(year, month - 1, date).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "bg-background border-content3 fixed z-40 w-80 rounded border p-3 shadow-lg transition-transform duration-75",
        className,
      )}
    >
      {/* Header with drag handle and close button */}
      <div className="mb-3 flex items-center justify-between">
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab touch-none active:cursor-grabbing"
        >
          <Grip size={16} className="[&>circle]:fill-content3" />
        </div>
        <h3 className="flex-1 px-2 text-sm font-semibold">{displayDate}</h3>
        <button
          onClick={onClose}
          className="hover:bg-content2 rounded p-1 transition-colors"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>
      </div>

      <Divider className="mb-3" />

      {/* Events List */}
      <div className="mb-4 space-y-2">
        {day.events.length > 0 ? (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {day.events.map((event) => (
              <div
                key={event.id}
                className="bg-content2 space-y-1 rounded p-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={clsx(
                      "font-medium",
                      event.type === "EXPENSE" ? "text-danger" : "text-success",
                    )}
                  >
                    {event.type === "EXPENSE" ? "-" : "+"}
                    {event.currency?.symbol} {Number(event.amount).toFixed(2)}
                  </span>
                  <span className="text-content4 text-xxs">
                    {event.quantity > 1 && `qty: ${event.quantity}`}
                  </span>
                </div>
                <div className="text-content4">{event.description}</div>
                {event.original_text && (
                  <div className="text-content4 border-content3 border-l-2 pl-2 italic">
                    "{event.original_text}"
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-content4 text-xs italic">
            No events for this day
          </div>
        )}
      </div>

      {/* Financial Summary */}
      {day.events.length > 0 && (
        <>
          <Divider className="mb-3" />
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-content4">Total Income</span>
              <span className="text-success font-medium">
                +{day.financialSummary.baseCurrencySymbol}{" "}
                {Number(day.financialSummary.totalIncome).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-content4">Total Expenses</span>
              <span className="text-danger font-medium">
                -{day.financialSummary.baseCurrencySymbol}{" "}
                {Number(day.financialSummary.totalExpenses).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span className="text-content4">Net</span>
              <span
                className={clsx(
                  Number(day.financialSummary.net) > 0
                    ? "text-success"
                    : "text-danger",
                )}
              >
                {day.financialSummary.baseCurrencySymbol}{" "}
                {Number(day.financialSummary.net).toFixed(2)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
