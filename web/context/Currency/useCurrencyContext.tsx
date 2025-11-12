import { useContext } from "react";

import { CurrencyContext } from "./CurrencyContext";

export const useCurrencyContext = () => {
  const context = useContext(CurrencyContext);

  if (context === undefined) {
    throw new Error("useCurrencyContext must be used within a CurrencyContext");
  }

  return context;
};
