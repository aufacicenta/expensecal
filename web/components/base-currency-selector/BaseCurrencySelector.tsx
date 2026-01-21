"use client";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { Spinner } from "@heroui/spinner";
import { ChevronDown, CircleDollarSign } from "lucide-react";
import { FC, useState } from "react";

import { BaseCurrencySelectorProps } from "./BaseCurrencySelector.types";

import { useCurrencyContext } from "@/context/Currency/useCurrencyContext";
import { useUserPreferencesContext } from "@/context/UserPreferences/useUserPreferencesContext";

export const BaseCurrencySelector: FC<BaseCurrencySelectorProps> = ({
  className,
}) => {
  const { currencies, loading: currenciesLoading } = useCurrencyContext();
  const {
    baseCurrency,
    loading: preferencesLoading,
    updateBaseCurrency,
  } = useUserPreferencesContext();
  const [updating, setUpdating] = useState(false);

  const handleCurrencySelect = async (currencyId: string) => {
    if (currencyId === baseCurrency?.id) return;

    setUpdating(true);
    await updateBaseCurrency(currencyId);
    setUpdating(false);

    // Force page reload to refetch calendar data with new base currency
    window.location.reload();
  };

  const isLoading = currenciesLoading || preferencesLoading || updating;

  return (
    <Dropdown>
      <DropdownTrigger>
        <button
          className={`flex cursor-pointer items-center gap-1 px-1 transition-opacity hover:opacity-80 ${className || ""}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <CircleDollarSign className="text-default-500" size={14} />
              <span className="text-default-500 text-xs font-medium">
                {baseCurrency?.symbol || "USD"}
              </span>
              <ChevronDown className="text-default-400" size={12} />
            </>
          )}
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Base currency selection"
        className="max-h-[300px] overflow-y-auto"
        disabledKeys={
          updating
            ? currencies
                .filter((c) => c.id !== undefined)
                .map((c) => c.id as string)
            : []
        }
        selectedKeys={baseCurrency?.id ? [baseCurrency.id] : []}
        selectionMode="single"
        variant="flat"
        onSelectionChange={(keys) => {
          const selectedKey = Array.from(keys)[0] as string;

          if (selectedKey) {
            handleCurrencySelect(selectedKey);
          }
        }}
      >
        {currencies
          .filter(
            (currency): currency is typeof currency & { id: string } =>
              currency.id !== undefined,
          )
          .map((currency) => (
            <DropdownItem
              key={currency.id}
              className={
                currency.id === baseCurrency?.id ? "bg-primary/10" : undefined
              }
              description={currency.name}
            >
              {currency.symbol}
            </DropdownItem>
          ))}
      </DropdownMenu>
    </Dropdown>
  );
};
