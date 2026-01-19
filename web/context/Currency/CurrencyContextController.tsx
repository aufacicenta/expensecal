import { useEffect, useState } from "react";

import { CurrencyContext } from "./CurrencyContext";
import {
  CurrencyContextControllerProps,
  CurrencyContextType,
} from "./CurrencyContext.types";

import { CurrencyData } from "@/app/api/v1/currencies/types";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";

export const CurrencyContextController = ({
  children,
}: CurrencyContextControllerProps) => {
  const routes = useRoutes();
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCurrencies = async () => {
    // Don't fetch if already cached and not loading
    if (currencies.length > 0) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(routes.api.v1.currencies.get());
      const data = await response.json();

      if (data.success) {
        setCurrencies(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch currencies:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch currencies on mount
  useEffect(() => {
    fetchCurrencies();
  }, []);

  const props: CurrencyContextType = {
    currencies,
    loading,
    fetchCurrencies,
  };

  return (
    <CurrencyContext.Provider value={props}>
      {children}
    </CurrencyContext.Provider>
  );
};
