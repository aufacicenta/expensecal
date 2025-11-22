import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import clsx from "clsx";
import { CircleCheckBig, CircleX } from "lucide-react";
import { useState } from "react";
import { EventCellCurrencyEditProps } from "./EventCellCurrencyEdit.types";

export const EventCellCurrencyEdit: React.FC<EventCellCurrencyEditProps> = ({
  event,
  availableCurrencies,
  onUpdate,
  onClose,
  className,
}) => {
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>(
    event.currency?.id || "",
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectionChange = (newSelection: "all" | Set<React.Key>) => {
    if (newSelection === "all") {
      return;
    }

    const selectedId = Array.from(newSelection as Set<React.Key>)[0];
    if (selectedId) {
      setSelectedCurrencyId(String(selectedId));
    }
  };

  const handleConfirm = async () => {
    try {
      setIsLoading(true);

      if (!event.id) {
        console.error("Event ID is missing");
        return;
      }

      if (!selectedCurrencyId) {
        console.error("Currency ID is missing");
        return;
      }

      await onUpdate(event.id, selectedCurrencyId, event.event_date);
      onClose();
    } catch (error) {
      console.error("Failed to update event currency:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={clsx("space-y-2", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Select
        selectionMode="single"
        placeholder="Select currency"
        selectedKeys={new Set([selectedCurrencyId])}
        onSelectionChange={handleSelectionChange}
        isDisabled={isLoading}
        size="sm"
        variant="bordered"
        classNames={{
          trigger: "min-h-10",
          listboxWrapper: "max-h-48",
        }}
      >
        {availableCurrencies.map((currency) => (
          <SelectItem
            key={currency.id || ""}
            textValue={currency.name}
            className="flex items-center gap-2"
          >
            <div className="flex w-full items-center gap-2">
              <span className="font-medium">{currency.symbol}</span>
            </div>
          </SelectItem>
        ))}
      </Select>
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          onPress={onClose}
          isDisabled={isLoading}
          variant="bordered"
          isIconOnly
        >
          <CircleX size={16} />
        </Button>
        <Button
          size="sm"
          color="primary"
          onPress={handleConfirm}
          isLoading={isLoading}
          variant="bordered"
          isIconOnly
        >
          <CircleCheckBig size={16} />
        </Button>
      </div>
    </div>
  );
};
