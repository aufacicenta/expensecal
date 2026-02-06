import { ReactNode } from "react";

import { BaseCurrencyData } from "@/app/api/v1/user-preferences/types";

export type UserPreferencesContextControllerProps = {
  children: ReactNode;
};

export type UserPreferencesContextType = {
  baseCurrency: BaseCurrencyData | null;
  loading: boolean;
  error: string | null;
  updateBaseCurrency: (currencyId: string) => Promise<boolean>;
  loadUserPreferences: () => Promise<void>;
};
