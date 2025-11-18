"use client";

import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { useEffect, useState } from "react";

import {
  GetExchangeRatesResponse,
  GetExchangeRatesSuccessResponse,
} from "@/app/api/v1/exchange-rates/types";
import { ExchangeRatesContext } from "./ExchangeRatesContext";
import {
  ExchangeRatesContextControllerProps,
  ExchangeRatesContextType,
} from "./ExchangeRatesContext.types";

export const ExchangeRatesContextController = ({
  children,
}: ExchangeRatesContextControllerProps) => {
  const routes = useRoutes();
  const [rates, setRates] = useState<
    GetExchangeRatesSuccessResponse["data"]["rates"] | undefined
  >(undefined);
  const [baseCurrency, setBaseCurrency] = useState<
    GetExchangeRatesSuccessResponse["data"]["baseCurrency"] | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadExchangeRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = routes.api.v1.exchangeRates.get();
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GetExchangeRatesResponse = await response.json();
      if (data.success) {
        const successResponse = data as typeof data & { data: any };
        setRates(successResponse.data.rates);
        setBaseCurrency(successResponse.data.baseCurrency);
        setLastUpdated(new Date());
      } else {
        const errorMsg = data.error || "Failed to load exchange rates";
        setError(errorMsg);
        console.error("Failed to load exchange rates:", errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Error loading exchange rates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!!rates) return;

    loadExchangeRates();
  }, []);

  const props: ExchangeRatesContextType = {
    rates,
    loading,
    error,
    lastUpdated,
    loadExchangeRates,
    baseCurrency,
  };

  return (
    <ExchangeRatesContext.Provider value={props}>
      {children}
    </ExchangeRatesContext.Provider>
  );
};
