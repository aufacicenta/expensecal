"use client";

import type { ThemeProviderProps } from "next-themes";

import { CalendarContextController } from "@/context/Calendar/CalendarContextController";
import { CalendarV2ContextController } from "@/context/CalendarV2/CalendarV2ContextController";
import { CurrencyContextController } from "@/context/Currency/CurrencyContextController";
import { EventCategoriesContextController } from "@/context/EventCategories/EventCategoriesContextController";
import { EventEditModalContextController } from "@/context/EventEditModal/EventEditModalContext";
import { EventsContextController } from "@/context/Events/EventsContextController";
import { FilteringContextController } from "@/context/Filtering/FilteringContextController";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider } from "@heroui/toast";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";
import * as React from "react";

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
        <CalendarContextController>
          <CalendarV2ContextController>
            <EventEditModalContextController>
              <EventsContextController>
                <CurrencyContextController>
                  <FilteringContextController>
                    <EventCategoriesContextController>
                      {children}
                    </EventCategoriesContextController>
                  </FilteringContextController>
                </CurrencyContextController>
              </EventsContextController>
            </EventEditModalContextController>
          </CalendarV2ContextController>
        </CalendarContextController>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
