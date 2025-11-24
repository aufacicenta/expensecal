import { useDraggable } from "@dnd-kit/core";
import { Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import clsx from "clsx";
import { Grip } from "lucide-react";
import { useState } from "react";

import { EventTextInputProps } from "./EventTextInput.types";

import { useEventsContext } from "@/context/Events/useEventsContext";
import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";

export const EventTextInput: React.FC<EventTextInputProps> = ({
  className,
  position = { x: 0, y: 0 },
}) => {
  const eventsController = useEventsContext();
  const calendarContext = useCalendarV2Context();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "event-text-input-draggable",
  });

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault();
      setLoading(true);

      try {
        // Single call: Parse text, create event, and optionally create installments
        // The LLM determines if split_installments should be applied
        const response = await eventsController.createEventFromText({
          current_date: calendarContext.currentMonth.toISOString(),
          text: input,
          create_installments: false, // @TODO: Set to true to enable installments for recurring events; the LLM will determine if amounts should be split
        });

        if ("error" in response) {
          addToast({
            title: "Error",
            description: response.error,
            color: "danger",
          });
        } else {
          const eventData = response.data;
          let description = `Created event: ${eventData.event.description}`;

          // Add installment info if installments were created
          if (eventData.installments) {
            description += ` (${eventData.installments.installment_count} installments created)`;
          }

          addToast({
            title: "Success",
            description,
            color: "success",
          });
          setInput("");
        }
      } catch (error) {
        addToast({
          title: "Error",
          description: error instanceof Error ? error.message : "Unknown error",
          color: "danger",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const style = {
    transform: `translate3d(${(position.x || 0) + (transform?.x || 0)}px, ${(position.y || 0) + (transform?.y || 0)}px, 0)`,
  };

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "bg-background border-primary fixed z-50 rounded border p-2 transition-transform duration-75",
        className,
      )}
      style={style}
    >
      <div className="flex gap-2">
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab touch-none active:cursor-grabbing"
        >
          <Grip className="[&>circle]:fill-content3" size={16} />
        </div>
        <Textarea
          className="w-full"
          description="Press Enter to parse and create event (Shift+Enter for new line)"
          disabled={loading}
          isDisabled={loading}
          label="Enter expense or income"
          placeholder="e.g., Spent $50 on groceries"
          value={input}
          onKeyDown={handleKeyDown}
          onValueChange={setInput}
        />
      </div>
    </div>
  );
};
