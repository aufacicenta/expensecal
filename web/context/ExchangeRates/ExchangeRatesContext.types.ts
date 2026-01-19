import { ReactNode } from "react";

import { GetExchangeRatesSuccessResponse } from "@/app/api/v1/exchange-rates/types";

export type ExchangeRatesContextControllerProps = {
  children: ReactNode;
};

export type ExchangeRatesContextType = {
  rates: GetExchangeRatesSuccessResponse["data"]["rates"] | undefined;
  baseCurrency:
    | GetExchangeRatesSuccessResponse["data"]["baseCurrency"]
    | undefined;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  loadExchangeRates: () => Promise<void>;
};
