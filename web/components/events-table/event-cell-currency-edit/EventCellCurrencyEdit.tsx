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
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Select
        classNames={{
          trigger: "min-h-10",
          listboxWrapper: "max-h-48",
        }}
        isDisabled={isLoading}
        placeholder="Select currency"
        selectedKeys={new Set([selectedCurrencyId])}
        selectionMode="single"
        size="sm"
        variant="bordered"
        onSelectionChange={handleSelectionChange}
      >
        {availableCurrencies.map((currency) => (
          <SelectItem
            key={currency.id || ""}
            className="flex items-center gap-2"
            textValue={currency.name}
          >
            <div className="flex w-full items-center gap-2">
              <span className="font-medium">{currency.symbol}</span>
            </div>
          </SelectItem>
        ))}
      </Select>
      <div className="flex justify-end gap-2">
        <Button
          isIconOnly
          isDisabled={isLoading}
          size="sm"
          variant="bordered"
          onPress={onClose}
        >
          <CircleX size={16} />
        </Button>
        <Button
          isIconOnly
          color="primary"
          isLoading={isLoading}
          size="sm"
          variant="bordered"
          onPress={handleConfirm}
        >
          <CircleCheckBig size={16} />
        </Button>
      </div>
    </div>
  );
};
