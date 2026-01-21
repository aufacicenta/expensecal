import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import clsx from "clsx";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { EventsMultiLineInputProps } from "./EventsMultiLineInput.types";

import { useEventsContext } from "@/context/Events/useEventsContext";
import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";

export const EventsMultiLineInput: React.FC<EventsMultiLineInputProps> = ({
  className,
  onSubmit,
}) => {
  const eventsController = useEventsContext();
  const calendarContext = useCalendarV2Context();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Autofocus the textarea when the component mounts
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setLoading(true);

    try {
      // Parse and create event from multiline text
      const response = await eventsController.createEventFromText({
        current_date: calendarContext.currentMonth.toISOString(),
        text: input,
        create_installments: false,
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

        // Call optional onSubmit callback (e.g., to close the modal)
        if (onSubmit) {
          onSubmit();
        }
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <Textarea
        ref={textareaRef}
        className="w-full"
        description="Ctrl+Enter (or Cmd+Enter on Mac) to submit"
        disabled={loading}
        isDisabled={loading}
        label="Enter expenses or income"
        maxRows={8}
        minRows={4}
        placeholder="e.g., Spent $50 on groceries tomorrow&#10;Got paid $2000 next Friday"
        value={input}
        variant="bordered"
        onKeyDown={handleKeyDown}
        onValueChange={setInput}
      />
      <Button
        color="primary"
        endContent={loading ? undefined : <Send size={16} />}
        isLoading={
          loading ||
          eventsController.actionStates.createEventFromText.isLoading ||
          calendarContext.actionStates.loadCalendarV2.isLoading
        }
        variant="bordered"
        onPress={handleSubmit}
      >
        {loading
          ? "Creating..."
          : calendarContext.actionStates.loadCalendarV2.isLoading
            ? "Refreshing Calendar"
            : "Create Events"}
      </Button>
    </div>
  );
};
