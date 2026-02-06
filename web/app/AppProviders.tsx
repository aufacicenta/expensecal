"use client";

import * as React from "react";

import { CalendarV2ContextController } from "@/context/CalendarV2/CalendarV2ContextController";
import { CurrencyContextController } from "@/context/Currency/CurrencyContextController";
import { EventCategoriesContextController } from "@/context/EventCategories/EventCategoriesContextController";
import { EventEditModalContextController } from "@/context/EventEditModal/EventEditModalContext";
import { EventGroupsContextController } from "@/context/EventGroups/EventGroupsContextController";
import { EventsContextController } from "@/context/Events/EventsContextController";
import { ExchangeRatesContextController } from "@/context/ExchangeRates/ExchangeRatesContextController";
import { InventoryContextController } from "@/context/Inventory/InventoryContextController";
import { FilteringContextController } from "@/context/Filtering/FilteringContextController";
import { UserPreferencesContextController } from "@/context/UserPreferences/UserPreferencesContextController";

export interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * App-specific providers for authenticated app pages.
 * Includes all context controllers for calendar, events, categories, etc.
 * Only wrap pages that need these contexts (e.g., /table, /calendar).
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <UserPreferencesContextController>
      <ExchangeRatesContextController>
        <FilteringContextController>
          <EventCategoriesContextController>
            <EventGroupsContextController>
              <CalendarV2ContextController>
                <EventEditModalContextController>
                  <EventsContextController>
                    <InventoryContextController>
                      <CurrencyContextController>
                        <>{children}</>
                      </CurrencyContextController>
                    </InventoryContextController>
                  </EventsContextController>
                </EventEditModalContextController>
              </CalendarV2ContextController>
            </EventGroupsContextController>
          </EventCategoriesContextController>
        </FilteringContextController>
      </ExchangeRatesContextController>
    </UserPreferencesContextController>
  );
}
