import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import clsx from "clsx";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { EventsMultiLineInputProps } from "./EventsMultiLineInput.types";

import { CreateFromTextSuccessResponse } from "@/app/api/v1/events/create-from-text/types";
import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { useEventsContext } from "@/context/Events/useEventsContext";

type LineResult = {
  line: string;
  success: boolean;
  data?: CreateFromTextSuccessResponse["data"];
  error?: string;
};

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

    // Split input by newlines and filter empty lines
    const lines = input
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    setLoading(true);

    try {
      // Process all lines in parallel, skipping calendar reload for each
      const results = await Promise.allSettled(
        lines.map(async (line): Promise<LineResult> => {
          try {
            const response = await eventsController.createEventFromText(
              {
                current_date: calendarContext.currentMonth.toISOString(),
                text: line,
                create_installments: false,
              },
              { skipReload: true },
            );

            if ("error" in response) {
              return { line, success: false, error: response.error };
            }

            return { line, success: true, data: response.data };
          } catch (error) {
            return {
              line,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        }),
      );

      // Reload calendar once after all events are processed
      await eventsController.reloadCalendar();

      // Aggregate results
      const successResults: LineResult[] = [];
      const failedResults: LineResult[] = [];

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            successResults.push(result.value);
          } else {
            failedResults.push(result.value);
          }
        } else {
          // Promise rejected (shouldn't happen since we catch inside)
          failedResults.push({
            line: "Unknown",
            success: false,
            error: result.reason?.message || "Unknown error",
          });
        }
      });

      // Show success toast if any events were created
      if (successResults.length > 0) {
        const descriptions = successResults
          .map((r) => r.data?.event.description)
          .filter(Boolean);

        addToast({
          title: `Created ${successResults.length} event${successResults.length > 1 ? "s" : ""}`,
          description:
            descriptions.length <= 3
              ? descriptions.join(", ")
              : `${descriptions.slice(0, 3).join(", ")} and ${descriptions.length - 3} more`,
          color: "success",
        });
      }

      // Show error toast if any events failed
      if (failedResults.length > 0) {
        const errorMessages = failedResults
          .map(
            (r) =>
              `"${r.line.slice(0, 30)}${r.line.length > 30 ? "..." : ""}": ${r.error}`,
          )
          .slice(0, 3);

        addToast({
          title: `Failed to create ${failedResults.length} event${failedResults.length > 1 ? "s" : ""}`,
          description: errorMessages.join("; "),
          color: "danger",
        });
      }

      // Clear input and call callback only if at least one succeeded
      if (successResults.length > 0) {
        setInput("");

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
