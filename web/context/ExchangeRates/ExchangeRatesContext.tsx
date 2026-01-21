import { createContext } from "react";

import { ExchangeRatesContextType } from "./ExchangeRatesContext.types";

export const ExchangeRatesContext = createContext<
  ExchangeRatesContextType | undefined
>(undefined);
