import { useContext } from "react";

import { ExchangeRatesContext } from "./ExchangeRatesContext";

export const useExchangeRatesContext = () => {
  const context = useContext(ExchangeRatesContext);

  if (context === undefined) {
    throw new Error(
      "useExchangeRatesContext must be used within a ExchangeRatesContext",
    );
  }

  return context;
};
