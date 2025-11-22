import { useCalendarV2Context } from "@/context/CalendarV2/useCalendarV2Context";
import { eventAmountSchema } from "@/lib/validators/event";
import { Input } from "@heroui/input";
import clsx from "clsx";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ZodError } from "zod";
import { EventCellAmountEditProps } from "./EventCellAmountEdit.types";

export type EventCellAmountEditHandle = {
  save: () => Promise<void>;
};

export const EventCellAmountEdit = forwardRef<
  EventCellAmountEditHandle,
  EventCellAmountEditProps
>(({ event, onUpdate, onClose, onLoadingChange, className }, ref) => {
  const { updateCalendarCellEvent } = useCalendarV2Context();
  const [value, setValue] = useState<string>(String(event.amount));
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSavedRef = useRef(false);

  // Focus and select input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    setError(""); // Clear error on change

    // Only update calendar context with valid amounts (not empty or NaN)
    if (newValue !== "" && !isNaN(Number(newValue))) {
      const updatedEvent = {
        ...event,
        amount: newValue,
      };
      updateCalendarCellEvent(updatedEvent, event.event_date);
    }
  };

  const handleSave = async () => {
    try {
      setError("");
      setIsLoading(true);
      // Notify parent when loading state changes
      onLoadingChange?.(true);
      isSavedRef.current = true;

      // Validate using zod schema
      const validatedData = eventAmountSchema.parse({
        amount: value,
      });

      if (!event.id) {
        console.error("Event ID is missing");
        setError("Event ID is missing");
        return;
      }

      await onUpdate(
        event.id,
        validatedData.amount.toString(),
        event.event_date,
      );
      onClose();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format ZodError into a comprehensive message
        const issues = error.issues.map((issue) => issue.message);
        const uniqueIssues = Array.from(new Set(issues));
        const errorMessage =
          uniqueIssues.length > 0
            ? uniqueIssues.join(" • ")
            : "Validation failed";
        setError(errorMessage);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to update amount");
      }
      console.error("Failed to update event amount:", error);
      isSavedRef.current = false;
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleBlur = () => {
    // Just close on blur - don't auto-save to allow switching between fields
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Expose handleSave and getIsLoading to parent via ref
  useImperativeHandle(ref, () => ({
    save: handleSave,
  }));

  return (
    <Input
      ref={inputRef}
      type="number"
      placeholder="Enter amount"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      isDisabled={isLoading}
      isInvalid={Boolean(error)}
      errorMessage={error}
      size="sm"
      variant="underlined"
      min="0"
      step="0.01"
      className={clsx("w-full", className)}
      classNames={{
        input: "text-right h-full",
      }}
    />
  );
});

EventCellAmountEdit.displayName = "EventCellAmountEdit";
