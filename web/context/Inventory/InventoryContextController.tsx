"use client";

import { useState } from "react";

import { useCalendarV2Context } from "../CalendarV2/useCalendarV2Context";

import { InventoryContext } from "./InventoryContext";
import {
  InventoryContextActionStates,
  InventoryContextType,
  InventoryControllerProps,
  ValuateItemResult,
  ValuateMultipleResult,
} from "./InventoryContext.types";

import { ValuateInventoryResponse } from "@/app/api/v1/inventory/valuate/types";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";

export const InventoryContextController = ({
  children,
}: InventoryControllerProps) => {
  const routes = useRoutes();
  const calendarContext = useCalendarV2Context();

  const [actionStates, setActionStates] =
    useState<InventoryContextActionStates>({
      valuateItem: { isLoading: false, error: undefined },
      valuateMultiple: { isLoading: false, error: undefined },
    });

  const [valuatingEventIds, setValuatingEventIds] = useState<Set<string>>(
    new Set(),
  );

  /**
   * Valuate a single inventory item
   */
  const valuateItem = async (eventId: string): Promise<ValuateItemResult> => {
    // Add to tracking set
    setValuatingEventIds((prev) => new Set(prev).add(eventId));

    setActionStates((prev) => ({
      ...prev,
      valuateItem: { isLoading: true, error: undefined },
    }));

    try {
      const response = await fetch(routes.api.v1.inventory.valuate(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_ids: [eventId] }),
      });

      const data = (await response.json()) as ValuateInventoryResponse;

      if (data.success && "data" in data && data.data?.results?.[0]?.success) {
        // Reload calendar data to get updated valuation
        await calendarContext.loadCalendarV2();

        setActionStates((prev) => ({
          ...prev,
          valuateItem: { isLoading: false, error: undefined },
        }));

        return {
          success: true,
          data: data.data.results[0],
        };
      } else {
        const errorMessage =
          ("data" in data && data.data?.results?.[0]?.error) ||
          ("error" in data && data.error) ||
          "Valuation failed";

        setActionStates((prev) => ({
          ...prev,
          valuateItem: { isLoading: false, error: errorMessage },
        }));

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        valuateItem: { isLoading: false, error: errorMsg },
      }));

      console.error("Error valuating inventory item:", error);

      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      // Remove from tracking set
      setValuatingEventIds((prev) => {
        const next = new Set(prev);

        next.delete(eventId);

        return next;
      });
    }
  };

  /**
   * Valuate multiple inventory items
   */
  const valuateMultiple = async (
    eventIds: string[],
  ): Promise<ValuateMultipleResult> => {
    // Add all to tracking set
    setValuatingEventIds((prev) => {
      const next = new Set(prev);

      eventIds.forEach((id) => next.add(id));

      return next;
    });

    setActionStates((prev) => ({
      ...prev,
      valuateMultiple: { isLoading: true, error: undefined },
    }));

    try {
      const response = await fetch(routes.api.v1.inventory.valuate(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_ids: eventIds }),
      });

      const data = (await response.json()) as ValuateInventoryResponse;

      if (data.success && "data" in data) {
        // Reload calendar data to get updated valuations
        await calendarContext.loadCalendarV2();

        setActionStates((prev) => ({
          ...prev,
          valuateMultiple: { isLoading: false, error: undefined },
        }));

        return {
          success: true,
          data: data.data,
        };
      } else {
        const errorMessage =
          ("error" in data && data.error) || "Valuation failed";

        setActionStates((prev) => ({
          ...prev,
          valuateMultiple: { isLoading: false, error: errorMessage },
        }));

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      setActionStates((prev) => ({
        ...prev,
        valuateMultiple: { isLoading: false, error: errorMsg },
      }));

      console.error("Error valuating multiple inventory items:", error);

      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      // Remove all from tracking set
      setValuatingEventIds((prev) => {
        const next = new Set(prev);

        eventIds.forEach((id) => next.delete(id));

        return next;
      });
    }
  };

  const props: InventoryContextType = {
    actionStates,
    valuatingEventIds,
    valuateItem,
    valuateMultiple,
  };

  return (
    <InventoryContext.Provider value={props}>
      {children}
    </InventoryContext.Provider>
  );
};
