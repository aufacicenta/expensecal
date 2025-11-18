import { eventQuantitySchema } from "@/lib/validators/event";
import { Input } from "@heroui/input";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { EventCellQuantityEditProps } from "./EventCellQuantityEdit.types";

export const EventCellQuantityEdit: React.FC<EventCellQuantityEditProps> = ({
  event,
  onUpdate,
  onClose,
  className,
}) => {
  const [value, setValue] = useState<string>(String(event.quantity));
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setError(""); // Clear error on change
  };

  const handleSave = async () => {
    try {
      setError("");
      setIsLoading(true);

      // Validate using zod schema
      const validatedData = eventQuantitySchema.parse({
        quantity: value,
      });

      if (!event.id) {
        console.error("Event ID is missing");
        setError("Event ID is missing");
        return;
      }

      await onUpdate(event.id, validatedData.quantity, event.event_date);
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to update quantity");
      }
      console.error("Failed to update event quantity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlur = () => {
    if (value !== String(event.quantity)) {
      handleSave();
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Input
      ref={inputRef}
      type="number"
      placeholder="Enter quantity"
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
};
