"use client";

import type { ThemeProviderProps } from "next-themes";

import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CalendarV2ContextController } from "@/context/CalendarV2/CalendarV2ContextController";
import { CurrencyContextController } from "@/context/Currency/CurrencyContextController";
import { EventCategoriesContextController } from "@/context/EventCategories/EventCategoriesContextController";
import { EventEditModalContextController } from "@/context/EventEditModal/EventEditModalContext";
import { EventsContextController } from "@/context/Events/EventsContextController";
import { ExchangeRatesContextController } from "@/context/ExchangeRates/ExchangeRatesContextController";
import { FilteringContextController } from "@/context/Filtering/FilteringContextController";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <ToastProvider />
      <NextThemesProvider {...themeProps}>
        <ExchangeRatesContextController>
          <FilteringContextController>
            <EventCategoriesContextController>
              <CalendarV2ContextController>
                <EventEditModalContextController>
                  <EventsContextController>
                    <CurrencyContextController>
                      <>{children}</>
                    </CurrencyContextController>
                  </EventsContextController>
                </EventEditModalContextController>
              </CalendarV2ContextController>
            </EventCategoriesContextController>
          </FilteringContextController>
        </ExchangeRatesContextController>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
