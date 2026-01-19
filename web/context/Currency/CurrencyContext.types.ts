import { ReactNode } from "react";

import { CurrencyData } from "@/app/api/v1/currencies/types";

export type CurrencyContextControllerProps = {
  children: ReactNode;
};

export type CurrencyContextType = {
  currencies: CurrencyData[];
  loading: boolean;
  fetchCurrencies: () => Promise<void>;
};
