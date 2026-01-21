import { Button } from "@heroui/button";
import { Select, SelectItem, SelectSection } from "@heroui/select";
import clsx from "clsx";
import { CircleCheckBig, CircleX } from "lucide-react";
import { useMemo, useState } from "react";

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

  // Group currencies by type (FIAT vs CRYPTO)
  const { fiatCurrencies, cryptoCurrencies } = useMemo(() => {
    const fiat = availableCurrencies.filter(
      (c) => c.currency_type === "FIAT" || !c.currency_type,
    );
    const crypto = availableCurrencies.filter(
      (c) => c.currency_type === "CRYPTO",
    );

    return { fiatCurrencies: fiat, cryptoCurrencies: crypto };
  }, [availableCurrencies]);

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
          listboxWrapper: "max-h-none",
        }}
        isDisabled={isLoading}
        placeholder="Select currency"
        selectedKeys={new Set([selectedCurrencyId])}
        selectionMode="single"
        size="sm"
        variant="bordered"
        onSelectionChange={handleSelectionChange}
      >
        {cryptoCurrencies.length > 0 ? (
          <>
            <SelectSection
              showDivider
              classNames={{
                heading: "text-xs font-semibold text-default-500 uppercase",
              }}
              title="Fiat Currencies"
            >
              {fiatCurrencies.map((currency) => (
                <SelectItem
                  key={currency.id || ""}
                  className="flex items-center gap-2"
                  textValue={`${currency.symbol} - ${currency.name}`}
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="font-medium">{currency.symbol}</span>
                    <span className="text-default-400 text-xs">
                      {currency.name}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectSection>
            <SelectSection
              classNames={{
                heading: "text-xs font-semibold text-default-500 uppercase",
              }}
              title="Cryptocurrencies"
            >
              {cryptoCurrencies.map((currency) => (
                <SelectItem
                  key={currency.id || ""}
                  className="flex items-center gap-2"
                  textValue={`${currency.symbol} - ${currency.name}`}
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="font-medium">{currency.symbol}</span>
                    <span className="text-default-400 text-xs">
                      {currency.name}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectSection>
          </>
        ) : (
          // When no crypto currencies exist, show flat list without sections
          availableCurrencies.map((currency) => (
            <SelectItem
              key={currency.id || ""}
              className="flex items-center gap-2"
              textValue={`${currency.symbol} - ${currency.name}`}
            >
              <div className="flex w-full items-center gap-2">
                <span className="font-medium">{currency.symbol}</span>
                <span className="text-default-400 text-xs">
                  {currency.name}
                </span>
              </div>
            </SelectItem>
          ))
        )}
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
