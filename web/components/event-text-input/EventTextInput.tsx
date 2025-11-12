import { useEventsContext } from "@/context/Events/useEventsContext";
import { useDraggable } from "@dnd-kit/core";
import { Textarea } from "@heroui/input";
import clsx from "clsx";
import { Grip } from "lucide-react";
import { useState } from "react";
import { EventTextInputProps } from "./EventTextInput.types";

export const EventTextInput: React.FC<EventTextInputProps> = ({
  className,
  position = { x: 0, y: 0 },
}) => {
  const eventsController = useEventsContext();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "event-text-input-draggable",
  });

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault();
      setLoading(true);
      setResult("");

      try {
        // Single call: Parse text, create event, and optionally create installments
        const response = await eventsController.createEventFromText({
          text: input,
          create_installments: true, // Automatically create installments if recurrence rule detected
        });

        if ("error" in response) {
          setResult(`Error: ${response.error}`);
        } else {
          const eventData = response.data;
          let successMessage = `Success! Created event: ${eventData.event.description}`;

          // Add installment info if installments were created
          if (eventData.installments) {
            successMessage += ` (${eventData.installments.installment_count} installments created)`;
          }

          setResult(successMessage);
          setInput("");
        }
      } catch (error) {
        setResult(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
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
      style={style}
      className={clsx(
        "bg-background border-primary fixed z-50 rounded border p-2 transition-transform duration-75",
        className,
      )}
    >
      <div className="flex gap-2">
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab touch-none active:cursor-grabbing"
        >
          <Grip size={16} className="[&>circle]:fill-content3" />
        </div>
        <Textarea
          label="Enter expense or income"
          placeholder="e.g., Spent $50 on groceries"
          value={input}
          onValueChange={setInput}
          onKeyDown={handleKeyDown}
          disabled={loading}
          isDisabled={loading}
          description="Press Enter to parse and create event (Shift+Enter for new line)"
          className="w-full"
        />
      </div>
      {result && (
        <div
          className={`w-full rounded-lg p-4 ${
            result.startsWith("Success")
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {result}
        </div>
      )}
    </div>
  );
};
