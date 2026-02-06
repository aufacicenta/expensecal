"use client";

import { useEffect, useState } from "react";

import { UserPreferencesContext } from "./UserPreferencesContext";
import {
  UserPreferencesContextControllerProps,
  UserPreferencesContextType,
} from "./UserPreferencesContext.types";

import {
  BaseCurrencyData,
  GetUserPreferencesResponse,
  UpdateUserPreferencesResponse,
} from "@/app/api/v1/user-preferences/types";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";

export const UserPreferencesContextController = ({
  children,
}: UserPreferencesContextControllerProps) => {
  const routes = useRoutes();
  const [baseCurrency, setBaseCurrency] = useState<BaseCurrencyData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserPreferences = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = routes.api.v1.userPreferences.get();
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GetUserPreferencesResponse = await response.json();

      if (data.success) {
        const successResponse = data as typeof data & {
          data: { baseCurrency: BaseCurrencyData };
        };

        setBaseCurrency(successResponse.data.baseCurrency);
      } else {
        const errorMsg = data.error || "Failed to load user preferences";

        setError(errorMsg);
        console.error("Failed to load user preferences:", errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      setError(errorMsg);
      console.error("Error loading user preferences:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateBaseCurrency = async (currencyId: string): Promise<boolean> => {
    setError(null);

    try {
      const url = routes.api.v1.userPreferences.update();
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ baseCurrencyId: currencyId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: UpdateUserPreferencesResponse = await response.json();

      if (data.success) {
        const successResponse = data as typeof data & {
          data: { baseCurrency: BaseCurrencyData };
        };

        setBaseCurrency(successResponse.data.baseCurrency);

        return true;
      } else {
        const errorMsg = data.error || "Failed to update base currency";

        setError(errorMsg);
        console.error("Failed to update base currency:", errorMsg);

        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      setError(errorMsg);
      console.error("Error updating base currency:", err);

      return false;
    }
  };

  // Load preferences on mount
  useEffect(() => {
    loadUserPreferences();
  }, []);

  const props: UserPreferencesContextType = {
    baseCurrency,
    loading,
    error,
    updateBaseCurrency,
    loadUserPreferences,
  };

  return (
    <UserPreferencesContext.Provider value={props}>
      {children}
    </UserPreferencesContext.Provider>
  );
};
