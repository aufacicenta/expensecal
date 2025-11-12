import { createContext } from "react";

import { CurrencyContextType } from "./CurrencyContext.types";

export const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);
